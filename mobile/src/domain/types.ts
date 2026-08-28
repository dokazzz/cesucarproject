/**
 * Tipos do domínio. Espelham os enums e o `to_dict()` do backend
 * (backend/database/models/enums.py e ride_offer.py) para que, quando o app
 * trocar o mock pela API real, nada aqui precise mudar.
 */

export type UserRole = 'ADMIN' | 'DRIVER' | 'PASSENGER';
export type TripType = 'GOING_TO_CESUCA' | 'RETURNING_HOME';
export type RideStatus = 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * Verificação de aluno. `UNVERIFIED` é o estado de quem nunca enviou
 * documento; `PENDING` fica bloqueado até alguém decidir; `REJECTED` carrega
 * motivo e permite reenvio. Publicar ou reservar carona exige `VERIFIED`
 * (ver `estaVerificado` em `domain/verificacao.ts`).
 */
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

/** O que a pessoa mandou como prova de vínculo com a instituição. */
export type VerificationDocumentType = 'STUDENT_ID' | 'ENROLLMENT_PROOF' | 'OTHER';

/**
 * Documento de verificação, guardado à parte do `User` (ver `db.documentosVerificacao`).
 *
 * MOCK: `uri` é o caminho local que o `expo-image-picker` devolve. Isto só é
 * seguro porque `db` inteiro vive em memória e nunca é persistido — nada
 * aqui pode ir para SecureStore, AsyncStorage ou localStorage. Quando o
 * backend real existir, `uri` vira o corpo de um upload de verdade e o que
 * volta para o app é uma referência de object storage, não mais o arquivo.
 */
export interface VerificationDocument {
  id: string;
  user_id: string;
  document_type: VerificationDocumentType;
  uri: string;
  submitted_at: string;
}

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'RIDE_REQUEST'
  | 'RIDE_APPROVED'
  | 'RIDE_REJECTED'
  | 'RIDE_CANCELLED'
  | 'SYSTEM';

/** 'ida' | 'volta' — o alias em português que o site usa nos filtros. */
export type Tipo = 'ida' | 'volta';

export interface User {
  id: string;
  full_name: string;
  rgm: string;
  role: UserRole;
  avatar: string;
  course: string | null;
  city: string | null;
  neighborhood: string | null;
  phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_seats: number | null;
  vehicle_plate: string | null;

  /**
   * Instituição de ensino. Só é livre no cadastro — depois disso, muda
   * exclusivamente por `alterarInstituicao` (api/client.ts), que reabre a
   * verificação. `atualizarPerfil` ignora este campo de propósito, para não
   * virar uma segunda porta pra trocar de instituição sem verificar de novo.
   */
  institution: string | null;
  verification_status: VerificationStatus;
  /** Referência a um `VerificationDocument`, nunca o arquivo em si. */
  verification_document_id: string | null;
  verification_rejected_reason: string | null;
}

export interface Ride {
  id: string;
  driver_id: string;
  trip_type: TripType;
  departure_city: string;
  destination: string;
  /** ISO 8601. `data`/`horario` são a versão já formatada pra leitura. */
  departure_time: string;
  available_seats: number;
  price_per_passenger: number;
  status: RideStatus;

  tipo: Tipo;
  origem: string;
  destino: string;
  data: string;
  horario: string;
  vagas: number;
  vagas_disp: number;
  valor: number;

  driver: string;
  driver_avatar: string;
  course: string | null;
  /** Instituição do motorista — mesma lógica de exibição do `course`, sem gate de privacidade. */
  driver_institution: string | null;
  driver_vehicle_brand: string | null;
  driver_vehicle_model: string | null;
  driver_vehicle_color: string | null;
  vehicle: string | null;
  neighborhood: string | null;

  /**
   * Só chegam depois que o motorista aprova — o backend segura contato até
   * existir uma relação que justifique (ride_offer.py, tier `contact`).
   */
  license_plate: string | null;
  driver_phone: string | null;
}

export interface RideRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_rgm: string;
  passenger_phone: string | null;
  status: RequestStatus;
  created_at: string;
  ride: Ride;
}

/**
 * Onde a viagem está no tempo. O mapa mostra os três pinos nos três estados,
 * mas o rótulo muda: um carro parado na origem porque ainda não saiu e um
 * carro parado na origem porque quebrou são a mesma imagem e coisas
 * diferentes, então a tela precisa saber qual dos dois é.
 */
export type EstadoDaViagem = 'NOT_STARTED' | 'IN_TRANSIT' | 'COMPLETED';

/**
 * Posição ao vivo do motorista numa carona.
 *
 * Mesma regra de privacidade da placa e do telefone: só existe pra quem é o
 * dono da carona ou teve a reserva aprovada. O backend precisa recusar no
 * servidor, não contar que o app esconda (ver docs/MAPA-AO-VIVO.md).
 */
export interface LocalizacaoCarona {
  ride_id: string;
  lat: number;
  lng: number;
  estado: EstadoDaViagem;
  /** ISO 8601 de quando o motorista mandou esta posição. */
  updated_at: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  time: string;
  is_read: boolean;
  related_ride_id: string | null;
}

/** Cidades atendidas — mesma lista dos <select> do site. */
export const CIDADES = [
  'Cachoeirinha',
  'Gravataí',
  'Canoas',
  'Alvorada',
  'Porto Alegre',
  'Viamão',
  'Sapucaia do Sul',
  'São Leopoldo',
] as const;

export const CURSOS = [
  'Análise e Desenvolvimento de Sistemas',
  'Administração',
  'Direito',
  'Enfermagem',
  'Engenharia Civil',
  'Psicologia',
  'Ciências Contábeis',
] as const;

/**
 * Semente de instituições pra região metropolitana de Porto Alegre — mesmo
 * recorte geográfico de `CIDADES`. Curta de propósito: é o que dá pra
 * validar sem um cadastro nacional de IES por trás.
 *
 * `<SeletorBusca>` sempre deixa usar o texto digitado mesmo quando não bate
 * com nada daqui, então uma instituição fora da lista não trava o cadastro —
 * só entra sem autocompletar.
 */
export const INSTITUICOES = [
  'Centro Universitário Cesuca',
  'UFRGS — Universidade Federal do Rio Grande do Sul',
  'PUCRS — Pontifícia Universidade Católica do RS',
  'Unisinos — Universidade do Vale do Rio dos Sinos',
  'Feevale — Universidade Feevale',
  'ULBRA — Universidade Luterana do Brasil',
  'Unilasalle — Universidade La Salle',
  'UniRitter',
  'ESPM Sul',
  'UCS — Universidade de Caxias do Sul',
  'IFRS — Instituto Federal do Rio Grande do Sul',
  'UFCSPA — Universidade Federal de Ciências da Saúde de Porto Alegre',
] as const;
