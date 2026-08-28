/**
 * Substituto de `Alert.alert` que também funciona na web.
 *
 * `react-native-web` exporta `Alert.alert` como um método vazio —
 * `class Alert { static alert() {} }` (node_modules/react-native-web/src/exports/Alert) —
 * então todo aviso e toda confirmação do app simplesmente não aparecia
 * nenhuma janela ao rodar no navegador. Isso incluía o próprio botão
 * "Reservar vaga": o toque abria um `Alert.alert` de confirmação que nunca
 * era desenhado, e sem alguém tocar em "Reservar" dentro dele a reserva
 * nunca disparava. `window.confirm`/`window.alert` do navegador cobrem o
 * mesmo papel na web; no nativo o comportamento continua sendo o
 * `Alert.alert` de sempre.
 */

import { Alert, Platform } from 'react-native';

export function avisar(titulo: string, mensagem?: string): void {
  if (Platform.OS === 'web') {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    return;
  }
  Alert.alert(titulo, mensagem);
}

interface OpcoesConfirmar {
  titulo: string;
  mensagem?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destrutivo?: boolean;
  onConfirmar: () => void;
}

export function confirmar({
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Voltar',
  destrutivo = false,
  onConfirmar,
}: OpcoesConfirmar): void {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem ? `${titulo}\n\n${mensagem}` : titulo)) {
      onConfirmar();
    }
    return;
  }
  Alert.alert(titulo, mensagem, [
    { text: textoCancelar, style: 'cancel' },
    {
      text: textoConfirmar,
      style: destrutivo ? 'destructive' : 'default',
      onPress: onConfirmar,
    },
  ]);
}
