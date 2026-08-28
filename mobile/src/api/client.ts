/**
 * Fachada de dados do app.
 *
 * TODAS as telas falam com este arquivo e com mais nenhum. Hoje ele responde
 * do mock em memória; quando o backend entrar, troque o corpo de cada função
 * por um `fetch` e nada mais no app precisa mudar. É por isso que as funções
 * já são `async` e já devolvem exatamente a forma que a API real devolve.
 */

import { filtrarCaronas, iniciais, rotaDe, tipoParaTripType } from '@/domain/carona';
import type {
  AppNotification,
  LocalizacaoCarona,
  Ride,
  RideRequest,
  Tipo,
  User,
  UserRole,
  VerificationDocument,
  VerificationDocumentType,
} from '@/domain/types';
import { comoData } from '@/domain/datas';
import { estaVerificado } from '@/domain/verificacao';
import { db, novoId } from '@/mocks/db';
import { localizacaoSimulada } from '@/mocks/localizacao';
import type { FiltroCaronas } from '@/domain/carona';

/** Atraso falso pra que os estados de carregamento apareçam na demo. */
const LATENCIA_MS = 320;

function esperar<T>(valor: T, ms = LATENCIA_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

/** Cópia rasa, pra nenhuma tela conseguir mutar o mock por acidente. */
function copiar<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class ApiError extends Error {}

// ── Autenticação ────────────────────────────────────────────────────────────

export interface Sessao {
  token: string;
  user: User;
}

export async function login(rgm: string, senha: string): Promise<Sessao> {
  const usuario = db.usuarios.find((u) => u.rgm === rgm);
  if (!usuario || senha !== '123456') {
    throw new ApiError('RGM ou senha incorretos.');
  }
  return esperar({ token: `demo-token-${usuario.id}`, user: copiar(usuario) });
}

export interface DadosCadastro {
  full_name: string;
  rgm: string;
  role: 'passenger' | 'driver';
  course?: string | null;
  city?: string | null;
  phone?: string | null;
  institution?: string | null;
}

export async function cadastrar(dados: DadosCadastro): Promise<Sessao> {
  if (db.usuarios.some((u) => u.rgm === dados.rgm)) {
    throw new ApiError('Já existe uma conta com este RGM.');
  }
  const novo: User = {
    id: novoId('u'),
    full_name: dados.full_name,
    rgm: dados.rgm,
    role: dados.role.toUpperCase() as UserRole,
    avatar: iniciais(dados.full_name),
    course: dados.course ?? null,
    city: dados.city ?? null,
    neighborhood: null,
    phone: dados.phone ?? null,
    vehicle_brand: null,
    vehicle_model: null,
    vehicle_color: null,
    vehicle_seats: null,
    vehicle_plate: null,
    institution: dados.institution ?? null,
    verification_status: 'UNVERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  };
  db.usuarios.push(novo);
  return esperar({ token: `demo-token-${novo.id}`, user: copiar(novo) });
}

/**
 * Campos que só mudam por um fluxo dedicado — nunca por `atualizarPerfil`.
 *
 * É a mesma ideia de `paraVisualizador` do lado de escrita: em vez de confiar
 * que toda tela vai lembrar de não mandar `institution` solto, a função
 * recusa por conta própria. `alterarInstituicao` e
 * `enviarDocumentoVerificacao`, mais abaixo, são as únicas portas.
 */
const CAMPOS_FORA_DO_PERFIL = [
  'institution',
  'verification_status',
  'verification_document_id',
  'verification_rejected_reason',
] as const satisfies readonly (keyof User)[];

export async function atualizarPerfil(userId: string, mudancas: Partial<User>): Promise<User> {
  const i = db.usuarios.findIndex((u) => u.id === userId);
  if (i < 0) throw new ApiError('Usuário não encontrado.');

  const atual = db.usuarios[i];
  if (!atual) throw new ApiError('Usuário não encontrado.');

  const permitidas = { ...mudancas };
  for (const campo of CAMPOS_FORA_DO_PERFIL) delete permitidas[campo];

  const atualizado: User = { ...atual, ...permitidas };
  atualizado.avatar = iniciais(atualizado.full_name);
  db.usuarios[i] = atualizado;

  return esperar(copiar(atualizado));
}

// ── Verificação de aluno ────────────────────────────────────────────────────

/**
 * Troca a instituição do usuário e reabre a verificação.
 *
 * Única porta pra mudar `institution` depois do cadastro — o documento já
 * enviado provava vínculo com a instituição antiga, não com esta, então o
 * status volta pra `UNVERIFIED` e um novo documento passa a ser exigido.
 */
export async function alterarInstituicao(userId: string, instituicao: string): Promise<User> {
  const i = db.usuarios.findIndex((u) => u.id === userId);
  if (i < 0) throw new ApiError('Usuário não encontrado.');
  const atual = db.usuarios[i];
  if (!atual) throw new ApiError('Usuário não encontrado.');

  const atualizado: User = {
    ...atual,
    institution: instituicao,
    verification_status: 'UNVERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  };
  db.usuarios[i] = atualizado;
  return esperar(copiar(atualizado));
}

/**
 * "Envia" o documento de verificação.
 *
 * MOCK — leia antes de trocar por uma chamada real: o `uri` que o
 * `expo-image-picker` devolve é um caminho local no aparelho, e ele fica só
 * em `db.documentosVerificacao`, em memória. O objeto `User` que a sessão
 * grava em SecureStore/localStorage carrega apenas `verification_document_id`,
 * uma referência opaca — nunca o arquivo. Quando o backend existir, este
 * `uri` vira o corpo de um upload de verdade (ex.: `multipart/form-data` pra
 * um endpoint que grava em object storage) e o que volta pro app continua
 * sendo só uma referência, agora do lado do servidor.
 */
export async function enviarDocumentoVerificacao(
  userId: string,
  uri: string,
  tipoDocumento: VerificationDocumentType,
): Promise<User> {
  const i = db.usuarios.findIndex((u) => u.id === userId);
  if (i < 0) throw new ApiError('Usuário não encontrado.');
  const atual = db.usuarios[i];
  if (!atual) throw new ApiError('Usuário não encontrado.');
  if (!atual.institution) {
    throw new ApiError('Escolha sua instituição antes de enviar o documento.');
  }

  const documento: VerificationDocument = {
    id: novoId('doc'),
    user_id: userId,
    document_type: tipoDocumento,
    uri,
    submitted_at: new Date().toISOString(),
  };
  db.documentosVerificacao.push(documento);

  const atualizado: User = {
    ...atual,
    verification_status: 'PENDING',
    verification_document_id: documento.id,
    verification_rejected_reason: null,
  };
  db.usuarios[i] = atualizado;
  return esperar(copiar(atualizado));
}

/**
 * ÁREA DE DEMONSTRAÇÃO — não existe num backend de verdade.
 *
 * Sem servidor, `PENDING` nunca sairia sozinho de lá; esta função simula a
 * decisão que normalmente sai de uma fila de revisão (manual ou automática),
 * do lado de fora do app de quem está se cadastrando. Existe só pra dar pra
 * ver o ciclo `PENDING` → `VERIFIED`/`REJECTED` fechado sem precisar de um
 * backend. Some quando o endpoint de revisão real entrar.
 */
export async function revisarVerificacaoDemo(
  userId: string,
  aprovado: boolean,
  motivo?: string,
): Promise<User> {
  const i = db.usuarios.findIndex((u) => u.id === userId);
  if (i < 0) throw new ApiError('Usuário não encontrado.');
  const atual = db.usuarios[i];
  if (!atual) throw new ApiError('Usuário não encontrado.');

  const atualizado: User = {
    ...atual,
    verification_status: aprovado ? 'VERIFIED' : 'REJECTED',
    verification_rejected_reason: aprovado
      ? null
      : motivo?.trim() || 'Documento ilegível ou inválido.',
  };
  db.usuarios[i] = atualizado;
  return esperar(copiar(atualizado));
}

// ── Caronas ─────────────────────────────────────────────────────────────────

/**
 * Aplica a mesma regra de privacidade do backend: contato do motorista só
 * aparece pra quem é o dono da carona ou teve o pedido aprovado.
 */
/**
 * A relação que justifica ver dado sensível de uma carona: ou você é o
 * motorista dono, ou teve a reserva aprovada por ele.
 *
 * Está numa função só porque governa duas coisas agora: contato (telefone e
 * placa) e posição ao vivo. Se fossem duas cópias da condição, um dia alguém
 * afrouxa uma e esquece a outra, e o vazamento sai pela porta que ninguém
 * lembrava que existia.
 */
function temVinculoCom(ride: Ride, viewerId: string | null): boolean {
  if (viewerId === null) return false;
  if (ride.driver_id === viewerId) return true;
  return db.pedidos.some(
    (p) => p.ride_id === ride.id && p.passenger_id === viewerId && p.status === 'APPROVED',
  );
}

function paraVisualizador(ride: Ride, viewerId: string | null): Ride {
  if (!temVinculoCom(ride, viewerId)) {
    return { ...ride, license_plate: null, driver_phone: null };
  }
  const motorista = db.usuarios.find((u) => u.id === ride.driver_id);
  return {
    ...ride,
    license_plate: motorista?.vehicle_plate ?? null,
    driver_phone: motorista?.phone ?? null,
  };
}

export async function listarCaronas(
  filtro: FiltroCaronas,
  viewerId: string | null,
): Promise<Ride[]> {
  const lista = filtrarCaronas(db.caronas, filtro).map((r) => paraVisualizador(r, viewerId));
  return esperar(copiar(lista));
}

export async function obterCarona(id: string, viewerId: string | null): Promise<Ride> {
  const ride = db.caronas.find((r) => r.id === id);
  if (!ride) throw new ApiError('Carona não encontrada.');
  return esperar(copiar(paraVisualizador(ride, viewerId)));
}

/**
 * Posição ao vivo do motorista nesta carona.
 *
 * Recusa quem não tem vínculo, em vez de devolver a posição e deixar a tela
 * decidir se mostra. Esconder no app não protege nada: qualquer um que
 * abrisse a resposta veria onde o motorista está. Quando o backend real
 * entrar, esta checagem tem que existir lá também, e a daqui vira só uma
 * segunda tranca (ver docs/MAPA-AO-VIVO.md).
 *
 * Devolve `null` quando a carona não é mapeável (cidade fora da lista) ou
 * quando ela não está mais de pé. Não é erro: é a tela sabendo que não tem
 * mapa pra mostrar.
 */
export async function localizacaoDaCarona(
  rideId: string,
  viewerId: string | null,
): Promise<LocalizacaoCarona | null> {
  const ride = db.caronas.find((r) => r.id === rideId);
  if (!ride) throw new ApiError('Carona não encontrada.');
  if (!temVinculoCom(ride, viewerId)) {
    throw new ApiError('Você não tem acesso à localização desta carona.');
  }
  if (ride.status === 'CANCELLED' || ride.status === 'COMPLETED') return null;

  // Latência menor que a das outras chamadas: isto roda em laço, de 8 em 8
  // segundos, e 320 ms de espera fingida a cada volta aparece como travada.
  return esperar(localizacaoSimulada(ride), 80);
}

export interface NovaCarona {
  tipo: Tipo;
  cidade: string;
  bairro: string | null;
  data: string;
  horario: string;
  vagas: number;
  valor: number;
}

export async function publicarCarona(dados: NovaCarona, motoristaId: string): Promise<Ride> {
  const motorista = db.usuarios.find((u) => u.id === motoristaId);
  if (!motorista) throw new ApiError('Motorista não encontrado.');
  if (!estaVerificado(motorista)) {
    throw new ApiError('Conclua a verificação de aluno para publicar caronas.');
  }

  const { origem, destino } = rotaDe(dados.cidade, dados.tipo);
  const veiculo = [motorista.vehicle_brand, motorista.vehicle_model].filter(Boolean).join(' ');

  const ride: Ride = {
    id: novoId('r'),
    driver_id: motorista.id,
    trip_type: tipoParaTripType(dados.tipo),
    departure_city: dados.cidade,
    destination: destino,
    departure_time: `${dados.data}T${dados.horario}:00`,
    available_seats: dados.vagas,
    price_per_passenger: dados.valor,
    status: 'ACTIVE',

    tipo: dados.tipo,
    origem,
    destino,
    data: comoData(dados.data),
    horario: dados.horario,
    vagas: dados.vagas,
    vagas_disp: dados.vagas,
    valor: dados.valor,

    driver: motorista.full_name,
    driver_avatar: motorista.avatar,
    course: motorista.course,
    driver_institution: motorista.institution,
    driver_vehicle_brand: motorista.vehicle_brand,
    driver_vehicle_model: motorista.vehicle_model,
    driver_vehicle_color: motorista.vehicle_color,
    vehicle: veiculo || null,
    neighborhood: dados.bairro,

    license_plate: motorista.vehicle_plate,
    driver_phone: motorista.phone,
  };

  db.caronas.unshift(ride);
  return esperar(copiar(ride));
}

export async function cancelarCarona(rideId: string, motoristaId: string): Promise<void> {
  const ride = db.caronas.find((r) => r.id === rideId);
  if (!ride) throw new ApiError('Carona não encontrada.');
  if (ride.driver_id !== motoristaId) throw new ApiError('Esta carona não é sua.');

  ride.status = 'CANCELLED';
  for (const p of db.pedidos) {
    if (p.ride_id === rideId && (p.status === 'PENDING' || p.status === 'APPROVED')) {
      p.status = 'CANCELLED';
    }
  }
  notificar(
    'RIDE_CANCELLED',
    `Você cancelou a carona ${ride.origem} para ${ride.destino}.`,
    rideId,
  );
  return esperar(undefined);
}

export async function minhasCaronas(motoristaId: string): Promise<Ride[]> {
  const lista = db.caronas
    .filter((r) => r.driver_id === motoristaId && r.status !== 'CANCELLED')
    .map((r) => paraVisualizador(r, motoristaId));
  return esperar(copiar(lista));
}

// ── Reservas ────────────────────────────────────────────────────────────────

function recalcularVagas(rideId: string): void {
  const ride = db.caronas.find((r) => r.id === rideId);
  if (!ride) return;
  const aprovados = db.pedidos.filter(
    (p) => p.ride_id === rideId && p.status === 'APPROVED',
  ).length;
  ride.vagas_disp = Math.max(0, ride.vagas - aprovados);
  if (ride.status !== 'CANCELLED') {
    ride.status = ride.vagas_disp > 0 ? 'ACTIVE' : 'FULL';
  }
}

export async function reservarVaga(rideId: string, passageiro: User): Promise<RideRequest> {
  const ride = db.caronas.find((r) => r.id === rideId);
  if (!ride) throw new ApiError('Carona não encontrada.');
  if (!estaVerificado(passageiro)) {
    throw new ApiError('Conclua a verificação de aluno para reservar vagas.');
  }
  if (ride.driver_id === passageiro.id) throw new ApiError('Esta carona é sua.');
  if (ride.vagas_disp <= 0) throw new ApiError('Esta carona já está cheia.');

  const jaTem = db.pedidos.find(
    (p) =>
      p.ride_id === rideId &&
      p.passenger_id === passageiro.id &&
      (p.status === 'PENDING' || p.status === 'APPROVED'),
  );
  if (jaTem) throw new ApiError('Você já tem uma reserva nesta carona.');

  const pedido: RideRequest = {
    id: novoId('req'),
    ride_id: rideId,
    passenger_id: passageiro.id,
    passenger_name: passageiro.full_name,
    passenger_rgm: passageiro.rgm,
    passenger_phone: null,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    ride: copiar(ride),
  };
  db.pedidos.push(pedido);

  notificar(
    'RIDE_REQUEST',
    `Sua solicitação foi enviada para ${ride.driver}. Aguarde a confirmação.`,
    rideId,
  );
  return esperar(copiar(pedido));
}

export async function cancelarReserva(rideId: string, passageiroId: string): Promise<void> {
  const pedido = db.pedidos.find(
    (p) =>
      p.ride_id === rideId &&
      p.passenger_id === passageiroId &&
      (p.status === 'PENDING' || p.status === 'APPROVED'),
  );
  if (!pedido) throw new ApiError('Reserva não encontrada.');

  pedido.status = 'CANCELLED';
  recalcularVagas(rideId);
  return esperar(undefined);
}

export async function meusPedidos(passageiroId: string): Promise<RideRequest[]> {
  const lista = db.pedidos
    .filter((p) => p.passenger_id === passageiroId && p.status !== 'CANCELLED')
    .map((p) => {
      const atual = db.caronas.find((r) => r.id === p.ride_id);
      return {
        ...p,
        ride: atual ? paraVisualizador(atual, passageiroId) : p.ride,
      };
    });
  return esperar(copiar(lista));
}

/** Pedidos PENDENTES nas caronas deste motorista. */
export async function pedidosRecebidos(motoristaId: string): Promise<RideRequest[]> {
  const minhas = new Set(
    db.caronas.filter((r) => r.driver_id === motoristaId).map((r) => r.id),
  );
  const lista = db.pedidos
    .filter((p) => minhas.has(p.ride_id) && p.status === 'PENDING')
    .map((p) => {
      const atual = db.caronas.find((r) => r.id === p.ride_id);
      return { ...p, ride: atual ? paraVisualizador(atual, motoristaId) : p.ride };
    });
  return esperar(copiar(lista));
}

export async function aprovarPedido(
  pedidoId: string,
  motoristaId: string,
): Promise<RideRequest> {
  const pedido = db.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new ApiError('Solicitação não encontrada.');

  const ride = db.caronas.find((r) => r.id === pedido.ride_id);
  if (!ride) throw new ApiError('Carona não encontrada.');
  if (ride.driver_id !== motoristaId) throw new ApiError('Esta carona não é sua.');
  if (ride.vagas_disp <= 0) throw new ApiError('Não há mais vagas nesta carona.');

  pedido.status = 'APPROVED';
  // Só agora o telefone do passageiro é liberado pro motorista.
  const passageiro = db.usuarios.find((u) => u.id === pedido.passenger_id);
  pedido.passenger_phone = passageiro?.phone ?? null;
  recalcularVagas(ride.id);

  notificar('RIDE_APPROVED', `Você confirmou ${pedido.passenger_name} na sua carona.`, ride.id);
  return esperar(copiar(pedido));
}

export async function recusarPedido(pedidoId: string, motoristaId: string): Promise<void> {
  const pedido = db.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new ApiError('Solicitação não encontrada.');

  const ride = db.caronas.find((r) => r.id === pedido.ride_id);
  if (!ride) throw new ApiError('Carona não encontrada.');
  if (ride.driver_id !== motoristaId) throw new ApiError('Esta carona não é sua.');

  pedido.status = 'REJECTED';
  recalcularVagas(ride.id);
  return esperar(undefined);
}

// ── Notificações ────────────────────────────────────────────────────────────

function notificar(
  type: AppNotification['type'],
  message: string,
  rideId: string | null,
): void {
  db.notificacoes.unshift({
    id: novoId('n'),
    type,
    message,
    time: 'agora',
    is_read: false,
    related_ride_id: rideId,
  });
}

export async function listarNotificacoes(): Promise<AppNotification[]> {
  return esperar(copiar(db.notificacoes));
}

export async function naoLidas(): Promise<number> {
  return esperar(db.notificacoes.filter((n) => !n.is_read).length, 0);
}

export async function marcarTodasLidas(): Promise<void> {
  for (const n of db.notificacoes) n.is_read = true;
  return esperar(undefined, 120);
}
