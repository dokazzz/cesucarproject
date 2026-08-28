import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';

import { aposMudanca, chaves } from '@/api/chaves';
import { listarNotificacoes, marcarTodasLidas } from '@/api/client';
import { invalidar } from '@/api/invalidar';
import type { NotificationType } from '@/domain/types';
import { useTheme } from '@/theme/theme';
import { spacing } from '@/theme/tokens';
import { Botao, Cartao, Carregando, Texto, Vazio } from '@/ui';
import { BellIcon } from '@/ui/icons';

/** Cor do ponto por tipo — sucesso aprovou, perigo cancelou, marca pediu. */
function corDoTipo(tipo: NotificationType, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tipo) {
    case 'RIDE_APPROVED':
    case 'SUCCESS':
      return colors.success;
    case 'RIDE_REJECTED':
    case 'RIDE_CANCELLED':
      return colors.danger;
    case 'RIDE_REQUEST':
    case 'WARNING':
      return colors.primary;
    default:
      return colors.textMuted;
  }
}

export default function Notificacoes() {
  const { colors } = useTheme();
  const qc = useQueryClient();

  const lista = useQuery({ queryKey: chaves.notificacoes.lista, queryFn: listarNotificacoes });

  const marcar = useMutation({
    mutationFn: marcarTodasLidas,
    onSuccess: () => invalidar(qc, aposMudanca.notificacoes),
  });

  if (lista.isPending) return <Carregando />;

  return (
    <View style={[estilos.raiz, { backgroundColor: colors.bg }]}>
      <FlatList
        data={lista.data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          (lista.data ?? []).some((n) => !n.is_read) ? (
            <Botao
              titulo="Marcar todas como lidas"
              variante="fantasma"
              tamanho="sm"
              bloco
              onPress={() => marcar.mutate()}
            />
          ) : null
        }
        ListEmptyComponent={
          <Vazio
            icone={<BellIcon size={28} color={colors.textDim} />}
            titulo="Sem notificações"
          />
        }
        renderItem={({ item }) => (
          <Cartao padding={spacing.lg}>
            <View style={estilos.item}>
              <View
                style={[
                  estilos.ponto,
                  {
                    backgroundColor: item.is_read
                      ? colors.textDim
                      : corDoTipo(item.type, colors),
                  },
                ]}
              />
              <View style={estilos.texto}>
                <Texto variante="legenda" peso={item.is_read ? 'regular' : 'bold'}>
                  {item.message}
                </Texto>
                <Texto variante="micro" cor="apagado" peso="regular">
                  {item.time}
                </Texto>
              </View>
            </View>
          </Cartao>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  lista: { padding: spacing.lg, gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md },
  ponto: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  texto: { flex: 1, gap: 2 },
});
