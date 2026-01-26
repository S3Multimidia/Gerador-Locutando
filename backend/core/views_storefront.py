import os
import random
import glob
import threading
import shutil
import time
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from pydub import AudioSegment
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import AudioRequest

# Configuration
AUDIO_LIBRARY_PATH = os.path.join(settings.BASE_DIR, 'audio-library')
TEMP_PATH = os.path.join(settings.BASE_DIR, 'temp_uploads')
OUTPUT_PATH = os.path.join(settings.BASE_DIR, 'generated_audio')

# Ensure paths exist
os.makedirs(TEMP_PATH, exist_ok=True)
os.makedirs(OUTPUT_PATH, exist_ok=True)

def normalize_audio(segment, target_dBFS=-3.0):
    """Simple peak normalization to target dBFS."""
    change_in_dBFS = target_dBFS - segment.max_dBFS
    return segment.apply_gain(change_in_dBFS)

def get_music_files(genres):
    """
    Collects 30 music files distributed among genres.
    """
    selected_files = []
    genre_map = {}
    
    # 1. Collect all valid files per genre
    valid_genres = []
    for genre in genres:
        genre_path = os.path.join(AUDIO_LIBRARY_PATH, genre)
        if not os.path.exists(genre_path):
            continue
        
        files = glob.glob(os.path.join(genre_path, '*.mp3')) + \
                glob.glob(os.path.join(genre_path, '*.wav'))
        if files:
            genre_map[genre] = files
            valid_genres.append(genre)

    if not valid_genres:
        raise ValueError("Nenhuma música encontrada nos gêneros selecionados.")

    # 2. Distribute 10 slots
    total_slots = 10
    base_per_genre = total_slots // len(valid_genres)
    extra = total_slots % len(valid_genres)
    
    slots = {g: base_per_genre for g in valid_genres}
    
    # Distribute extra
    for i in range(extra):
        slots[valid_genres[i]] += 1

    # 3. Pick files
    final_playlist = []
    for genre in valid_genres:
        files = genre_map[genre]
        count = slots[genre]
        random.shuffle(files)
        
        # If not enough files, cyclic repeat
        picked = []
        while len(picked) < count:
            needed = count - len(picked)
            picked.extend(files[:needed])
        
        final_playlist.extend(picked[:count])
    
    # 4. Shuffle Final Playlist
    random.shuffle(final_playlist)
    return final_playlist

def check_cancellation(request_id):
    """Checks if the request has been cancelled by the user."""
    try:
        req = AudioRequest.objects.get(id=request_id)
        if req.status == 'CANCELLED':
            print(f"[{request_id}] CANCELLED BY USER.")
            return True
    except:
        pass
    return False

def process_audio_task(request_id, genres, off_file_paths):
    """
    Background task to process audio.
    """
    print(f"[{request_id}] STARTING PROCESSING...")
    try:
        if check_cancellation(request_id): return

        req = AudioRequest.objects.get(id=request_id)
        req.status = 'PROCESSING'
        req.save()

        # 2. Prepare Music Playlist
        playlist_files = get_music_files(genres)

        if check_cancellation(request_id): return

        # 3. Load and Concatenate Music
        music_track = AudioSegment.empty()
        crossfade_ms = 3000
        
        for fpath in playlist_files:
            if check_cancellation(request_id): return
            try:
                seg = AudioSegment.from_file(fpath)
                seg = normalize_audio(seg, target_dBFS=-3.0) 
                
                if len(music_track) > 0:
                    music_track = music_track.append(seg, crossfade=crossfade_ms)
                else:
                    music_track = seg
            except Exception as e:
                print(f"Error loading {fpath}: {e}")
                continue

        if len(music_track) == 0:
             raise Exception('Erro ao processar músicas (nenhuma válida).')

        if check_cancellation(request_id): return

        # 4. Prepare Voiceovers
        off_segments = []
        for off_file in off_file_paths:
            seg = AudioSegment.from_file(off_file)
            seg = normalize_audio(seg, target_dBFS=-1.0)
            off_segments.append(seg)
        
        # 5. Insert Voiceovers and Apply Ducking
        insert_interval_ms = 90 * 1000 # 90s
        current_time = insert_interval_ms
        off_idx = 0
        music_len = len(music_track)
        
        duck_regions = []
        
        while current_time < music_len:
            off_seg = off_segments[off_idx % len(off_segments)]
            start_pos = current_time
            end_pos = start_pos + len(off_seg)
            
            if end_pos > music_len:
                break 
            
            duck_regions.append((start_pos, end_pos))
            current_time += insert_interval_ms
            off_idx += 1

        if check_cancellation(request_id): return

        # Re-build music with ducking (Simple Volume Ducking)
        source_music = music_track
        processed_music = AudioSegment.empty()
        last_boundary = 0
        
        for k in range(len(duck_regions)):
            if check_cancellation(request_id): return
            d_start, d_end = duck_regions[k]
            
            # We need to crossfade between the "Loud" music and "Quiet" music.
            # To do this smoothly:
            # 1. We take the loud chunk BEFORE the voice
            # 2. We take the quiet chunk DURING the voice
            # 3. We crossfade them at the boundary
            
            # Simplified approach (Hard Cut + Fade):
            # Normal Chunk (Loud)
            normal_chunk = source_music[last_boundary : d_start]
            
            # Ducked Chunk (Quiet)
            ducked_chunk = source_music[d_start : d_end] - 15 # Less aggressive reduction (was 20)
            
            # Apply Fade In/Out to the quiet part to smooth the volume change
            # 800ms fade makes it sound like a radio DJ moving the fader
            ducked_chunk = ducked_chunk.fade_in(800).fade_out(800)
            
            # Append
            processed_music += normal_chunk
            # We crossfade the transition from Normal->Ducked to avoid clicks if possible
            # But simple appending with fade_in on the ducked chunk works well enough for background
            processed_music = processed_music.append(ducked_chunk, crossfade=100)
            
            last_boundary = d_end
        
        # Append remaining
        processed_music += source_music[last_boundary:]
        
        # Overlay Voices
        final_mix = processed_music
        for i, (d_start, d_end) in enumerate(duck_regions):
            if check_cancellation(request_id): return
            off_seg = off_segments[i % len(off_segments)]
            final_mix = final_mix.overlay(off_seg, position=d_start)

        if check_cancellation(request_id): return

        # 6. Export File
        filename = f"porta_loja_{request_id}_{int(time.time())}.mp3"
        output_full_path = os.path.join(OUTPUT_PATH, filename)
        
        final_mix.export(output_full_path, format="mp3", bitrate="320k")

        # 7. Update Request
        from django.utils import timezone
        req = AudioRequest.objects.get(id=request_id)
        # Double check if cancelled at the very end
        if req.status == 'CANCELLED': return

        req.status = 'COMPLETED'
        req.output_file = filename 
        req.completed_at = timezone.now()
        req.save()
        
        print(f"[{request_id}] COMPLETED SUCCESSFULLY.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[{request_id}] FAILED: {e}")
        try:
            req = AudioRequest.objects.get(id=request_id)
            if req.status != 'CANCELLED':
                req.status = 'FAILED'
                req.error_message = str(e)
                req.save()
        except:
            pass
    finally:
        # Cleanup temp files
        for f in off_file_paths:
            try:
                os.remove(f)
            except:
                pass


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_audio(request):
    try:
        # 1. Inputs
        genres = request.data.getlist('genres') # DRF uses request.data
        if not genres:
             genres = request.POST.getlist('genres')

        uploaded_offs = request.FILES.getlist('offs')
        if not uploaded_offs:
            return JsonResponse({'error': 'Nenhuma locução enviada.'}, status=400)

        # Save files to temp
        saved_paths = []
        for f in uploaded_offs:
            temp_name = f"temp_{random.randint(1000,9999)}_{f.name}"
            temp_full_path = os.path.join(TEMP_PATH, temp_name)
            with open(temp_full_path, 'wb+') as destination:
                for chunk in f.chunks():
                    destination.write(chunk)
            saved_paths.append(temp_full_path)

        # Create DB Request
        audio_req = AudioRequest.objects.create(
            user=request.user,
            status='PENDING',
            input_data={'genres': genres}
        )

        # Start Thread
        t = threading.Thread(
            target=process_audio_task,
            args=(audio_req.id, genres, saved_paths)
        )
        t.start()

        return JsonResponse({
            'success': True, 
            'message': 'Processamento iniciado em segundo plano.',
            'request_id': audio_req.id
        })

    except Exception as e:
        return JsonResponse({'error': f'Erro ao iniciar: {str(e)}'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_request(request, request_id):
    """Cancel a processing request."""
    try:
        req = AudioRequest.objects.get(id=request_id, user=request.user)
        if req.status in ['PENDING', 'PROCESSING']:
            req.status = 'CANCELLED'
            req.save()
            return JsonResponse({'success': True, 'message': 'Pedido cancelado.'})
        return JsonResponse({'error': 'Não é possível cancelar este pedido.'}, status=400)
    except AudioRequest.DoesNotExist:
        return JsonResponse({'error': 'Pedido não encontrado.'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_requests(request):
    """List last 20 requests for the user."""
    reqs = AudioRequest.objects.filter(user=request.user).order_by('-created_at')[:20]
    data = []
    for r in reqs:
        data.append({
            'id': r.id,
            'status': r.status,
            'created_at': r.created_at,
            'completed_at': r.completed_at,
            'error_message': r.error_message,
            'output_file': r.output_file 
        })
    return JsonResponse(data, safe=False)

@api_view(['GET'])
@permission_classes([AllowAny])
def download_audio_file(request, filename):
    """Serve the generated file."""
    # Security check: ensure file is in OUTPUT_PATH
    file_path = os.path.join(OUTPUT_PATH, filename)
    if not os.path.exists(file_path):
         return JsonResponse({'error': 'File not found'}, status=404)
    
    # Ideally check if user owns this file, but filename is random enough for now.
    
    with open(file_path, 'rb') as f:
        file_data = f.read()

    response = HttpResponse(file_data, content_type='audio/mpeg')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
