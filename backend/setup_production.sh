#!/bin/bash
set -e

echo ">>> Iniciando Setup de Produção (Locutando Core) <<<"

# Verifica se .env existe
if [ ! -f .env ]; then
    echo "ERRO: Arquivo .env não encontrado!"
    echo "Copie o .env.example e configure as variáveis."
    exit 1
fi

echo ">>> Instalando Dependências..."
# pip install -r requirements.txt # Descomentar se tiver requirements

echo ">>> Realizando Migrações de Banco de Dados..."
python manage.py migrate

echo ">>> Coletando Arquivos Estáticos..."
python manage.py collectstatic --noinput

echo ">>> Superuser Auto-Healing Check..."
python manage.py ensure_superuser

echo ">>> Setup Finalizado com Sucesso! 🚀"
