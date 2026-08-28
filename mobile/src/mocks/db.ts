/**
 * Banco de mentira, em memória.
 *
 * O v1.0 é uma maquete navegável: tudo que a API real faria acontece aqui,
 * na mesma forma de dados. Trocar por HTTP depois é mexer em `src/api/client.ts`
 * e em nada mais — nenhuma tela sabe que os dados são falsos.
 *
 * O estado vive enquanto o app estiver aberto. Recarregou, volta ao inicial:
 * é o que a gente quer numa demo.
 */

import { iniciais, rotaDe, tipoParaTripType } from '@/domain/carona';
import { comoData, hojeISO } from '@/domain/datas';
import type {
  AppNotification,
  Ride,
  RideRequest,
  Tipo,
  User,
  VerificationDocument,
} from '@/domain/types';

let seq = 0;
export const novoId = (prefixo: string) => `${prefixo}-${++seq}`;

// ── Usuários ────────────────────────────────────────────────────────────────

/** As duas contas de demonstração. A senha de ambas é `123456`. */
export const CONTAS_DEMO = [
  { rgm: '20240001', senha: '123456', papel: 'Passageiro', nome: 'Iago' },
  { rgm: '20240002', senha: '123456', papel: 'Motorista', nome: 'Marina' },
] as const;

function fazerUsuario(u: Omit<User, 'avatar'>): User {
  return { ...u, avatar: iniciais(u.full_name) };
}

/**
 * As contas seed já nascem `VERIFIED`: são contas de demonstração
 * estabelecidas, não gente que acabou de se cadastrar. Só quem passa por
 * `cadastrar()` nasce `UNVERIFIED` — é ali que o fluxo novo aparece.
 */
const usuariosBase: User[] = [
  fazerUsuario({
    id: 'u-1',
    full_name: 'Iago Ribeiro',
    rgm: '20240001',
    role: 'PASSENGER',
    course: 'Análise e Desenvolvimento de Sistemas',
    city: 'Gravataí',
    neighborhood: 'Bom Sucesso',
    phone: '(51) 99812-4477',
    vehicle_brand: null,
    vehicle_model: null,
    vehicle_color: null,
    vehicle_seats: null,
    vehicle_plate: null,
    institution: 'Centro Universitário Cesuca',
    verification_status: 'VERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  }),
  fazerUsuario({
    id: 'u-2',
    full_name: 'Marina Costa',
    rgm: '20240002',
    role: 'DRIVER',
    course: 'Direito',
    city: 'Cachoeirinha',
    neighborhood: 'Vila Cachoeirinha',
    phone: '(51) 99640-1188',
    vehicle_brand: 'Volkswagen',
    vehicle_model: 'Gol 2020',
    vehicle_color: 'Prata',
    vehicle_seats: 4,
    vehicle_plate: 'IWZ4C21',
    institution: 'Centro Universitário Cesuca',
    verification_status: 'VERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  }),
  fazerUsuario({
    id: 'u-3',
    full_name: 'Bruno Almeida',
    rgm: '20240003',
    role: 'DRIVER',
    course: 'Engenharia Civil',
    city: 'Canoas',
    neighborhood: 'Nossa Senhora das Graças',
    phone: '(51) 99333-2091',
    vehicle_brand: 'Chevrolet',
    vehicle_model: 'Onix 2022',
    vehicle_color: 'Branco',
    vehicle_seats: 4,
    vehicle_plate: 'ABC1D23',
    institution: 'UFRGS — Universidade Federal do Rio Grande do Sul',
    verification_status: 'VERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  }),
  fazerUsuario({
    id: 'u-4',
    full_name: 'Carla Menezes',
    rgm: '20240004',
    role: 'DRIVER',
    course: 'Psicologia',
    city: 'Alvorada',
    neighborhood: 'Umbu',
    phone: '(51) 99177-6543',
    vehicle_brand: 'Fiat',
    vehicle_model: 'Argo 2021',
    vehicle_color: 'Vermelho',
    vehicle_seats: 4,
    vehicle_plate: 'IVX7788',
    institution: 'PUCRS — Pontifícia Universidade Católica do RS',
    verification_status: 'VERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  }),
  fazerUsuario({
    id: 'u-5',
    full_name: 'Diego Fontoura',
    rgm: '20240005',
    role: 'DRIVER',
    course: 'Administração',
    city: 'Porto Alegre',
    neighborhood: 'Sarandi',
    phone: '(51) 99055-3311',
    vehicle_brand: 'Hyundai',
    vehicle_model: 'HB20 2019',
    vehicle_color: 'Grafite',
    vehicle_seats: 4,
    vehicle_plate: 'ABC1234',
    institution: 'Unisinos — Universidade do Vale do Rio dos Sinos',
    verification_status: 'VERIFIED',
    verification_document_id: null,
    verification_rejected_reason: null,
  }),
];

// ── Caronas ─────────────────────────────────────────────────────────────────

interface SementeCarona {
  driver_id: string;
  tipo: Tipo;
  cidade: string;
  bairro: string | null;
  diaOffset: number;
  horario: string;
  vagas: number;
  ocupadas: number;
  valor: number;
}

/**
 * Horário da carona que a demo usa pra mostrar o mapa: daqui a poucos minutos.
 *
 * As outras sementes têm horário fixo, que é o que faz a lista parecer uma
 * grade real de caronas. Esta é a exceção, e o motivo é concreto: a posição do
 * motorista é calculada a partir do horário de saída, então uma carona fixa às
 * 07:20 só tem o que mostrar no mapa entre 07:05 e 07:45. Fora dessa janela a
 * tela dizia "viagem concluída" com o pino parado, e a demonstração parecia
 * quebrada sem estar.
 *
 * Saindo daqui a pouco, ela cai no meio da viagem a qualquer hora do dia, e o
 * carro anda de verdade enquanto alguém olha.
 *
 * Isto é mock. O backend real não inventa horário nenhum.
 */
function horarioDaDemo(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Tabela de dados: uma semente por linha, alinhada de propósito — expandir isso
// em dez linhas cada esconde o padrão que faz a demo parecer real.
// prettier-ignore
const sementes: SementeCarona[] = [
  { driver_id: 'u-2', tipo: 'ida',   cidade: 'Cachoeirinha', bairro: 'Vila Cachoeirinha', diaOffset: 0, horario: horarioDaDemo(), vagas: 3, ocupadas: 1, valor: 8  },
  { driver_id: 'u-3', tipo: 'ida',   cidade: 'Canoas',       bairro: 'Mathias Velho',     diaOffset: 0, horario: '18:40', vagas: 4, ocupadas: 0, valor: 12 },
  { driver_id: 'u-4', tipo: 'ida',   cidade: 'Alvorada',     bairro: 'Umbu',              diaOffset: 0, horario: '19:00', vagas: 3, ocupadas: 3, valor: 10 },
  { driver_id: 'u-5', tipo: 'ida',   cidade: 'Porto Alegre', bairro: 'Sarandi',           diaOffset: 0, horario: '18:10', vagas: 4, ocupadas: 2, valor: 14 },
  { driver_id: 'u-2', tipo: 'volta', cidade: 'Cachoeirinha', bairro: null,                diaOffset: 0, horario: '22:40', vagas: 3, ocupadas: 0, valor: 8  },
  { driver_id: 'u-3', tipo: 'volta', cidade: 'Canoas',       bairro: null,                diaOffset: 0, horario: '22:50', vagas: 4, ocupadas: 1, valor: 12 },
  { driver_id: 'u-5', tipo: 'ida',   cidade: 'Porto Alegre', bairro: 'Sarandi',           diaOffset: 1, horario: '07:00', vagas: 4, ocupadas: 0, valor: 14 },
  { driver_id: 'u-4', tipo: 'volta', cidade: 'Alvorada',     bairro: null,                diaOffset: 1, horario: '23:00', vagas: 3, ocupadas: 0, valor: 10 },
  { driver_id: 'u-3', tipo: 'ida',   cidade: 'Canoas',       bairro: 'Mathias Velho',     diaOffset: 2, horario: '13:30', vagas: 4, ocupadas: 0, valor: 12 },
];

function montarCarona(s: SementeCarona, motoristas: User[]): Ride {
  const motorista = motoristas.find((u) => u.id === s.driver_id);
  if (!motorista) throw new Error(`Motorista ${s.driver_id} não existe no mock.`);

  const dataISO = hojeISO(s.diaOffset);
  const { origem, destino } = rotaDe(s.cidade, s.tipo);
  const veiculo = [motorista.vehicle_brand, motorista.vehicle_model].filter(Boolean).join(' ');

  return {
    id: novoId('r'),
    driver_id: motorista.id,
    trip_type: tipoParaTripType(s.tipo),
    departure_city: s.cidade,
    destination: destino,
    departure_time: `${dataISO}T${s.horario}:00`,
    available_seats: s.vagas,
    price_per_passenger: s.valor,
    status: s.vagas - s.ocupadas > 0 ? 'ACTIVE' : 'FULL',

    tipo: s.tipo,
    origem,
    destino,
    data: comoData(dataISO),
    horario: s.horario,
    vagas: s.vagas,
    vagas_disp: Math.max(0, s.vagas - s.ocupadas),
    valor: s.valor,

    driver: motorista.full_name,
    driver_avatar: motorista.avatar,
    course: motorista.course,
    driver_institution: motorista.institution,
    driver_vehicle_brand: motorista.vehicle_brand,
    driver_vehicle_model: motorista.vehicle_model,
    driver_vehicle_color: motorista.vehicle_color,
    vehicle: veiculo || null,
    neighborhood: s.bairro,

    // Segurados até a aprovação, igual ao backend real faz.
    license_plate: null,
    driver_phone: null,
  };
}

// ── Estado mutável da sessão de demo ────────────────────────────────────────

interface Estado {
  usuarios: User[];
  caronas: Ride[];
  pedidos: RideRequest[];
  notificacoes: AppNotification[];
  /**
   * Documentos de verificação. Fica fora de `usuarios` de propósito: é a
   * única parte do mock que guarda algo parecido com um arquivo (o `uri`
   * local do `expo-image-picker`), e separar deixa claro que isto nunca deve
   * ser serializado pra SecureStore/AsyncStorage/localStorage junto do
   * `User` — só o `verification_document_id` (uma referência) viaja com ele.
   */
  documentosVerificacao: VerificationDocument[];
}

/**
 * A reserva já aprovada com que a demo começa.
 *
 * Ela fecha uma incoerência que existia no seed: a primeira carona nasce com
 * `ocupadas: 1` e a notificação diz que a Marina confirmou a vaga do Iago,
 * mas nenhuma reserva existia pra sustentar as duas coisas. Este é o pedido
 * que faltava, então o lugar ocupado agora tem dono.
 *
 * Também é o que deixa a demo mostrar o mapa. Localização ao vivo só aparece
 * pra quem tem reserva aprovada, e sem isto seria preciso reservar, sair,
 * entrar como motorista, aprovar e voltar só pra ver a tela.
 */
function pedidoAprovadoDaDemo(caronas: Ride[], usuarios: User[]): RideRequest[] {
  const carona = caronas[0];
  const passageiro = usuarios.find((u) => u.id === 'u-1');
  if (!carona || !passageiro) return [];

  const motorista = usuarios.find((u) => u.id === carona.driver_id);

  return [
    {
      id: novoId('req'),
      ride_id: carona.id,
      passenger_id: passageiro.id,
      passenger_name: passageiro.full_name,
      passenger_rgm: passageiro.rgm,
      passenger_phone: passageiro.phone,
      status: 'APPROVED',
      created_at: new Date().toISOString(),
      ride: {
        ...carona,
        // Aprovado libera contato, igual `paraVisualizador` faria.
        license_plate: motorista?.vehicle_plate ?? null,
        driver_phone: motorista?.phone ?? null,
      },
    },
  ];
}

function estadoInicial(): Estado {
  seq = 0;
  const listaUsuarios = usuariosBase.map((u) => ({ ...u }));
  const caronas = sementes.map((s) => montarCarona(s, listaUsuarios));

  return {
    usuarios: listaUsuarios,
    caronas,
    pedidos: pedidoAprovadoDaDemo(caronas, listaUsuarios),
    documentosVerificacao: [],
    notificacoes: [
      {
        id: novoId('n'),
        type: 'RIDE_APPROVED',
        message: `Marina Costa confirmou sua vaga na carona das ${caronas[0]?.horario ?? ''}.`,
        time: 'há 2 h',
        is_read: false,
        related_ride_id: caronas[0]?.id ?? null,
      },
      {
        id: novoId('n'),
        type: 'INFO',
        message: 'Bruno Almeida publicou uma carona de Canoas às 18:40.',
        time: 'há 5 h',
        is_read: false,
        related_ride_id: caronas[1]?.id ?? null,
      },
      {
        id: novoId('n'),
        type: 'SYSTEM',
        message: 'Bem-vindo ao Uroute. Complete seu perfil pra aparecer melhor nas buscas.',
        time: 'ontem',
        is_read: true,
        related_ride_id: null,
      },
    ],
  };
}

export const db: Estado = estadoInicial();

/** Reseta a demo ao estado inicial. Útil antes de apresentar pro grupo. */
export function resetarDemo(): void {
  const novo = estadoInicial();
  db.usuarios = novo.usuarios;
  db.caronas = novo.caronas;
  db.pedidos = novo.pedidos;
  db.documentosVerificacao = novo.documentosVerificacao;
  db.notificacoes = novo.notificacoes;
}
