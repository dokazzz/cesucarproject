import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import { RouteIcon } from './icons';
import { Texto } from './Texto';
import type { PropsMapa } from './MapaCarona.tipos';

const ALTURA = 220;

/**
 * O mapa no navegador.
 *
 * `react-native-maps` não roda na web: ele embrulha o mapa nativo do Android
 * e do iOS, e no browser não existe nada pra embrulhar. Sem este arquivo, o
 * `npm run web` quebra no import, não na hora de desenhar, ou seja: a tela
 * inteira some, não só o mapa. Já aconteceu uma vez neste projeto com o
 * bundle web, então aqui vai o desvio explícito.
 *
 * O Metro escolhe este arquivo sozinho por causa do sufixo `.web`, sem
 * nenhum `if (Platform.OS === ...)` espalhado pelas telas.
 *
 * Mostra a rota em texto em vez de um retângulo cinza vazio: quem abre no
 * navegador continua sabendo de onde a carona sai e pra onde vai, que é a
 * parte da informação que não depende de mapa nenhum.
 */
export function MapaCarona({ rotuloOrigem, rotuloDestino, descricao }: PropsMapa) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        estilos.moldura,
        { borderColor: colors.overlayBorder, backgroundColor: colors.surfaceMuted },
      ]}
      accessible
      accessibilityLabel={descricao}
    >
      <RouteIcon size={28} color={colors.primary} />
      <View style={estilos.rota}>
        <Texto variante="legenda" peso="bold" numberOfLines={1}>
          {rotuloOrigem}
        </Texto>
        <Texto style={{ color: colors.primary }}>{'↓'}</Texto>
        <Texto variante="legenda" peso="bold" numberOfLines={1}>
          {rotuloDestino}
        </Texto>
      </View>
      <Texto variante="micro" cor="apagado" peso="regular">
        O mapa ao vivo aparece no aplicativo, no celular.
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: {
    height: ALTURA,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  rota: { alignItems: 'center', gap: spacing.xs },
});
