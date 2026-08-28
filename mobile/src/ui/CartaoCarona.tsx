import { StyleSheet, View } from 'react-native';

import { formatarValor, vagasDisponiveis } from '@/domain/carona';
import type { Ride } from '@/domain/types';
import { useTheme } from '@/theme/theme';
import { fontSize, fontWeight, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Cartao } from './Cartao';
import { Etiqueta } from './Etiqueta';
import { CarIcon } from './icons';
import { Texto } from './Texto';

/** Descrição do carro a partir do que o motorista preencheu. */
function descreverVeiculo(r: Ride): string | null {
  const partes = [r.driver_vehicle_brand, r.driver_vehicle_model, r.driver_vehicle_color];
  const texto = partes.filter(Boolean).join(' ');
  return texto || r.vehicle || null;
}

interface Props {
  ride: Ride;
  onPress?: () => void;
  /** Estado da SUA reserva nesta carona, se houver. */
  meuStatus?: 'PENDING' | 'APPROVED' | null;
  compacto?: boolean;
}

export function CartaoCarona({ ride, onPress, meuStatus = null, compacto = false }: Props) {
  const { colors } = useTheme();
  const vagas = vagasDisponiveis(ride);
  const veiculo = descreverVeiculo(ride);

  return (
    <Cartao onPress={onPress} padding={compacto ? spacing.md : spacing.lg}>
      <View style={estilos.topo}>
        <Avatar iniciais={ride.driver_avatar} tamanho={compacto ? 36 : 44} />

        <View style={estilos.identidade}>
          <Texto variante="corpo" peso="heavy" numberOfLines={1}>
            {ride.driver}
          </Texto>
          {!compacto && ride.course ? (
            <Texto variante="micro" cor="apagado" peso="regular" numberOfLines={1}>
              {ride.course}
            </Texto>
          ) : null}
        </View>

        <View style={estilos.preco}>
          <Texto
            style={{
              color: colors.primary,
              fontSize: compacto ? fontSize.lg : fontSize.xl,
              fontWeight: fontWeight.heavy,
            }}
          >
            {`R$${formatarValor(ride.valor)}`}
          </Texto>
          <Texto variante="micro" cor="apagado" peso="regular">
            por pessoa
          </Texto>
        </View>
      </View>

      <View style={estilos.rota}>
        <Texto variante="corpo" peso="bold" numberOfLines={1} style={estilos.cidade}>
          {ride.origem}
        </Texto>
        <Texto style={{ color: colors.primary, fontSize: fontSize.lg }}>{'→'}</Texto>
        <Texto variante="corpo" peso="bold" numberOfLines={1} style={estilos.cidade}>
          {ride.destino}
        </Texto>
        <Texto variante="corpo" cor="suave" peso="bold">
          {`· ${ride.horario}`}
        </Texto>
      </View>

      <View style={estilos.etiquetas}>
        <Etiqueta tom={ride.tipo === 'ida' ? 'ida' : 'volta'}>
          {ride.tipo === 'ida' ? '→ Ida' : '← Volta'}
        </Etiqueta>
        <Etiqueta>{ride.data}</Etiqueta>
        {ride.neighborhood ? <Etiqueta>{ride.neighborhood}</Etiqueta> : null}
        {ride.driver_institution ? <Etiqueta>{ride.driver_institution}</Etiqueta> : null}
        {veiculo ? (
          <View style={[estilos.veiculo, { backgroundColor: colors.primarySoft }]}>
            <CarIcon size={12} color={colors.primary} />
            <Texto variante="micro" peso="heavy" style={{ color: colors.primary }}>
              {veiculo}
            </Texto>
          </View>
        ) : null}
        {ride.license_plate ? <Etiqueta>{ride.license_plate}</Etiqueta> : null}
        <Etiqueta tom={vagas > 0 ? 'sucesso' : 'perigo'}>
          {vagas > 0 ? `${vagas} vaga${vagas !== 1 ? 's' : ''}` : 'Esgotado'}
        </Etiqueta>
        {meuStatus === 'PENDING' ? <Etiqueta tom="aviso">Aguardando</Etiqueta> : null}
        {meuStatus === 'APPROVED' ? <Etiqueta tom="sucesso">Confirmado</Etiqueta> : null}
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identidade: { flex: 1, gap: 2 },
  preco: { alignItems: 'flex-end' },
  rota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cidade: { flexShrink: 1 },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  veiculo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
