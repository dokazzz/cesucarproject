import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BackArrowIcon,
  BicycleIcon,
  BusIcon,
  CarIcon,
  CompassIcon,
  DestinationFlagIcon,
  FavoriteStarIcon,
  GpsIcon,
  LocationPinIcon,
  MenuIcon,
  MotorcycleIcon,
  ProfileIcon,
  RouteIcon,
  SearchIcon,
  SettingsIcon,
  WalkingIcon,
} from './index';
import type { IconProps } from './types';

/**
 * Grade de revisão visual do set inteiro, a 24px, num fundo claro e um
 * escuro lado a lado — é o que muda mais rápido quando `currentColor` não
 * está resolvendo como esperado. Não é uma rota do app: importe
 * `<IconsPreview>` numa tela qualquer pra visualizar, ou peça pra eu ligar
 * isso a uma rota de desenvolvimento se preferir abrir direto no celular.
 */
const ICONES: { nome: string; Icone: (props: IconProps) => ReactElement }[] = [
  { nome: 'LocationPinIcon', Icone: LocationPinIcon },
  { nome: 'RouteIcon', Icone: RouteIcon },
  { nome: 'GpsIcon', Icone: GpsIcon },
  { nome: 'CompassIcon', Icone: CompassIcon },
  { nome: 'DestinationFlagIcon', Icone: DestinationFlagIcon },
  { nome: 'CarIcon', Icone: CarIcon },
  { nome: 'BusIcon', Icone: BusIcon },
  { nome: 'MotorcycleIcon', Icone: MotorcycleIcon },
  { nome: 'WalkingIcon', Icone: WalkingIcon },
  { nome: 'BicycleIcon', Icone: BicycleIcon },
  { nome: 'SearchIcon', Icone: SearchIcon },
  { nome: 'SettingsIcon', Icone: SettingsIcon },
  { nome: 'ProfileIcon', Icone: ProfileIcon },
  { nome: 'MenuIcon', Icone: MenuIcon },
  { nome: 'BackArrowIcon', Icone: BackArrowIcon },
];

function Grade({ fundo, texto, corIcone }: { fundo: string; texto: string; corIcone: string }) {
  return (
    <View style={[estilos.grade, { backgroundColor: fundo }]}>
      {ICONES.map(({ nome, Icone }) => (
        <View key={nome} style={estilos.item}>
          <Icone size={24} color={corIcone} />
          <Text style={[estilos.rotulo, { color: texto }]} numberOfLines={1}>
            {nome.replace('Icon', '')}
          </Text>
        </View>
      ))}

      <View style={estilos.item}>
        <FavoriteStarIcon size={24} color={corIcone} />
        <Text style={[estilos.rotulo, { color: texto }]}>Star</Text>
      </View>
      <View style={estilos.item}>
        <FavoriteStarIcon size={24} color={corIcone} filled />
        <Text style={[estilos.rotulo, { color: texto }]}>Star (filled)</Text>
      </View>
    </View>
  );
}

export function IconsPreview() {
  return (
    <ScrollView contentContainerStyle={estilos.raiz}>
      <Text style={estilos.titulo}>Uroute icon set — claro</Text>
      <Grade fundo="#ffffff" texto="#10131A" corIcone="#10131A" />

      <Text style={estilos.titulo}>Uroute icon set — escuro</Text>
      <Grade fundo="#0A0E16" texto="#EEF1F8" corIcone="#EEF1F8" />

      <Text style={estilos.titulo}>Cor de marca (índigo)</Text>
      <Grade fundo="#ffffff" texto="#10131A" corIcone="#4F46E5" />
    </ScrollView>
  );
}

export default IconsPreview;

const estilos = StyleSheet.create({
  raiz: { padding: 16, gap: 12 },
  titulo: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
    borderRadius: 12,
  },
  item: { width: 84, alignItems: 'center', gap: 6 },
  rotulo: { fontSize: 10, textAlign: 'center' },
});
