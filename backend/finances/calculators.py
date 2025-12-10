from decimal import Decimal

class VoiceCostCalculator:
    """
    Motor de Precificação Centralizado.
    Permite versionamento de preços e lógica complexa (ex: desconto por volume).
    """
    
    # Preço base por caractere (R$)
    PRICE_PER_CHAR = Decimal('0.005') # Ex: R$ 5,00 por 1000 caracteres
    MINUMUM_COST = Decimal('0.10')

    @classmethod
    def calculate(cls, text: str, model_tier: str = 'standard') -> Decimal:
        """
        Calcula o custo de uma geração de voz baseada no texto e tier.
        
        Args:
            text (str): O texto a ser locutado.
            model_tier (str): 'standard', 'premium', 'ultra'.
            
        Returns:
            Decimal: Custo final validado.
        """
        if not text:
            return Decimal('0.00')
            
        char_count = len(text)
        
        # Multiplicadores por tier
        multiplier = Decimal('1.0')
        if model_tier == 'premium':
            multiplier = Decimal('1.5')
        elif model_tier == 'ultra':
            multiplier = Decimal('2.0')
            
        raw_cost = (Decimal(char_count) * cls.PRICE_PER_CHAR) * multiplier
        
        # Custo mínimo para evitar micro-transações que não pagam infra
        final_cost = max(raw_cost, cls.MINUMUM_COST)
        
        # Round up to 2 decimal places properly if needed, usually banks truncate or round half up.
        # Python's quantize default is ROUND_HALF_EVEN. Let's force strict 2 places.
        return final_cost.quantize(Decimal('0.01'))

    @classmethod
    def validate_client_estimate(cls, text: str, client_estimate: Decimal) -> bool:
        """
        Double Check: Valida se o valor enviado pelo frontend bate com o cálculo do backend.
        Margem de erro (tolerância) de 1 centavo.
        """
        server_cost = cls.calculate(text)
        diff = abs(server_cost - client_estimate)
        return diff <= Decimal('0.01')
