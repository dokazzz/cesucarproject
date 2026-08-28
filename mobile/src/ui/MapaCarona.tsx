import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { regiaoQueEnquadra } from '@/domain/geo';
import { useTheme } from '@/theme/theme';
import { radius } from '@/theme/tokens';
import type { PropsMapa } from './MapaCarona.tipos';

const ALTURA = 220;

/**
 * Os três pinos da carona: de onde sai, pra onde vai, e onde o motorista está.
 *
 * Sem rota desenhada de propósito. Uma linha reta ligando os pinos mentiria
 * (o carro anda por rua, não por cima dos prédios) e a rota de verdade exige
 * uma API de rotas paga, que docs/MAPA-AO-VIVO.md decidiu não usar agora.
 * Três pinos já respondem "cadê minha carona", que é a pergunta real.
 *
 * O mapa é fixo, sem arrastar nem dar zoom. Ele mora dentro do ScrollView da
 * `Tela`, e mapa que aceita arrasto engole a rolagem da página: o dedo tenta
 * descer a tela e o mapa entende que é pra andar pro sul. Enquadrar sozinho
 * nos três pinos resolve sem gesto nenhum.
 */
export function MapaCarona({
  origem,
  destino,
  motorista,
  rotuloOrigem,
  rotuloDestino,
  descricao,
}: PropsMapa) {
  const { colors } = useTheme();

  const pontos = motorista ? [origem, destino, motorista] : [origem, destino];
  const regiao = regiaoQueEnquadra(pontos);
  if (!regiao) return null;

  return (
    <View
      style={[estilos.moldura, { borderColor: colors.overlayBorder }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={descricao}
    >
      <MapView
        style={estilos.mapa}
        // `region` e não `initialRegion`: a posição do motorista chega por
        // polling, e com `initialRegion` o enquadramento congelaria no
        // primeiro quadro e o carro sairia andando pra fora da tela.
        region={{
          latitude: regiao.centro.lat,
          longitude: regiao.centro.lng,
          latitudeDelta: regiao.deltaLat,
          longitudeDelta: regiao.deltaLng,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        // O mapa já está descrito na moldura acima; sem isto o leitor de tela
        // entra nos controles internos e lê coisa que não dá pra usar.
        importantForAccessibility="no-hide-descendants"
      >
        <Marker
          coordinate={{ latitude: origem.lat, longitude: origem.lng }}
          title={rotuloOrigem}
          description="Saída"
          pinColor={colors.primary}
        />
        <Marker
          coordinate={{ latitude: destino.lat, longitude: destino.lng }}
          title={rotuloDestino}
          description="Destino"
          pinColor={colors.success}
        />
        {motorista ? (
          <Marker
            coordinate={{ latitude: motorista.lat, longitude: motorista.lng }}
            title="Motorista"
            description="Posição mais recente"
            pinColor={colors.warning}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: {
    height: ALTURA,
    borderRadius: radius.md,
    borderWidth: 1,
    // Sem isto o mapa vaza por cima do canto arredondado no Android.
    overflow: 'hidden',
  },
  mapa: { flex: 1 },
});
