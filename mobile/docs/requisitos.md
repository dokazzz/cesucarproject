# Requisitos do uRoute

Consolidação do que estava espalhado entre o README do CESUCAR, o README do Uroute e o ROADMAP. Este é o documento de referência: se um requisito não está aqui, ele não existe.

**Versão:** 1.0 · 26/08/2026
**Status:** rascunho — precisa de revisão do grupo

---

## 1. O problema

Todo dia, dezenas de alunos do CESUCA saem da mesma cidade, no mesmo horário, para o mesmo lugar. Cada um no seu carro, cada um pagando sozinho o combustível. Ou pegando três ônibus.

Quatro sintomas:

- Carro com lugar vazio saindo da mesma rua todo dia
- Combustível e passagem pesando no orçamento de estudante
- Duas horas de ônibus para um trajeto de trinta minutos
- Aula que termina tarde e ninguém querendo voltar sozinho

## 2. Para quem

Alunos do **Centro Universitário CESUCA**, Cachoeirinha/RS.

Cidades atendidas: Cachoeirinha, Gravataí, Canoas, Alvorada, Porto Alegre, Viamão, Sapucaia do Sul, São Leopoldo.

Tipos de viagem: **ida** (cidade → CESUCA) e **volta** (CESUCA → cidade).

### Atores

| Ator           | O que faz                                                    |
| -------------- | ------------------------------------------------------------ |
| **Passageiro** | Busca rota, solicita vaga, acompanha reservas                |
| **Motorista**  | Publica rota, define vagas e valor, aprova ou recusa pedidos |
| **Admin**      | Gestão da plataforma — **só no site, fora do escopo do app** |

Um mesmo usuário pode ser passageiro e motorista. A troca de papel é feita no Perfil e reflete na hora na navegação.

---

## 3. Regras de negócio

Estas são as regras que definem o produto. Mudar qualquer uma delas muda o que o uRoute é.

**RN01 — Acesso fechado por RGM.**
Só entra quem tem RGM do CESUCA. Não é carona com estranho da internet, é com colega de faculdade. RGM tem 8 dígitos.

**RN02 — Toda reserva passa por aprovação do motorista.**
Ninguém entra no carro de ninguém sem o motorista aprovar. Sem surpresa para nenhum dos lados.

**RN03 — Contato só aparece depois da aprovação.**
Telefone e placa do motorista ficam ocultos até a reserva ser aprovada. Regra de privacidade do backend, respeitada pelo app.

**RN04 — É rateio, não tarifa.**
A plataforma calcula o custo do trajeto e divide entre os passageiros. Ninguém lucra com ninguém — é gasolina dividida. Isso não é detalhe de implementação, é o que separa o uRoute de um app de motorista e cliente.

**RN05 — Uma carona cheia não aceita mais reservas.**

---

## 4. Requisitos funcionais

### Autenticação

| ID   | Requisito                                                 | Status v1.0        |
| ---- | --------------------------------------------------------- | ------------------ |
| RF01 | Criar conta com RGM, senha e dados pessoais               | mock               |
| RF02 | Entrar com RGM e senha                                    | mock               |
| RF03 | Validar RGM (8 dígitos), senha e placa no formato correto | pronto, regra real |
| RF04 | Manter login guardado com segurança (`expo-secure-store`) | pronto             |

### Passageiro

| ID   | Requisito                                                               | Status v1.0        |
| ---- | ----------------------------------------------------------------------- | ------------------ |
| RF05 | Buscar caronas por cidade, tipo de viagem, faixa de horário e vagas     | mock               |
| RF06 | Ver detalhe da carona: motorista, rota, horário, vagas, valor do rateio | mock               |
| RF07 | Solicitar vaga                                                          | mock               |
| RF08 | Acompanhar minhas reservas e seus status                                | mock               |
| RF09 | Ver contato do motorista **após** aprovação                             | pronto, regra real |

### Motorista

| ID   | Requisito                                                | Status v1.0        |
| ---- | -------------------------------------------------------- | ------------------ |
| RF10 | Publicar rota com origem, destino, data, horário e vagas | mock               |
| RF11 | Calcular o rateio do combustível                         | pronto, regra pura |
| RF12 | Ver solicitações recebidas                               | mock               |
| RF13 | Aprovar ou recusar solicitação                           | mock               |

### Comum

| ID   | Requisito                                 | Status v1.0 |
| ---- | ----------------------------------------- | ----------- |
| RF14 | Editar perfil                             | mock        |
| RF15 | Trocar entre papel passageiro e motorista | pronto      |
| RF16 | Ver notificações                          | mock        |
| RF17 | Receber notificação push                  | Sprint 5    |

---

## 5. Requisitos não funcionais

**RNF01 — Duas plataformas, um código.** Android e iOS a partir do mesmo código TypeScript.

**RNF02 — Tema claro e escuro**, seguindo o sistema do celular. Muita gente usa o app à noite voltando da aula.

**RNF03 — Uma única porta de dados.** `src/api/client.ts` é o único lugar que fala com dados. Nenhuma tela sabe de onde eles vêm.

**RNF04 — Lógica pura separada.** `src/domain` só tem regra: validar RGM, calcular rateio, filtrar lista. Sem tela, sem `fetch`. É a parte testável sem abrir o app.

**RNF05 — Kit de peças único.** Botão, campo, cartão e etiqueta vêm de `src/ui`. Ninguém escreve `Pressable` com cor na mão.

**RNF06 — Paginação.** A API v1 devolve `{items, next_cursor, has_more}`. Usar `/api/v1`, nunca `/api`.

**RNF07 — Tom de voz de gente.**

| Assim                       | Não assim                           |
| --------------------------- | ----------------------------------- |
| "Sua vaga foi confirmada"   | "Requisição processada com sucesso" |
| "Esta carona já está cheia" | "Erro 409: capacidade excedida"     |
| "Você"                      | "O usuário"                         |

Se um calouro não entender a frase, a frase está errada.

**RNF08 — Nenhum segredo no código.** Senha, chave ou token nunca dentro do repositório.

---

## 6. Identidade visual

Cores portadas direto do `css/style.css` do site, mesmos hex:

| Cor      | Hex       | Uso                                     |
| -------- | --------- | --------------------------------------- |
| Azul     | `#0f4c81` | Cor principal. Confiança, instituição   |
| Laranja  | `#e85d24` | Destaque e ação. Os botões que importam |
| Verde    | `#2f9e83` | Confirmado, aprovado, deu certo         |
| Amarelo  | `#f4b942` | Atenção, pendente, aguardando           |
| Vermelho | `#dc4c4c` | Cancelado, erro                         |

---

## 7. Fora de escopo

O que **não** entra e por quê:

| Item                                 | Motivo                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| Tela de admin no app                 | Mais complexa, menos usada. Admin usa o site. Ver decisão `0003` |
| Pagamento dentro do app              | É rateio combinado entre as pessoas, não transação da plataforma |
| Rastreamento em tempo real da viagem | Fora do v1. Peso alto de privacidade e de LGPD                   |
| Carona entre cidades não listadas    | Escopo é CESUCA e região metropolitana                           |

---

## 8. Em aberto

Coisas que ainda não são requisito porque falta decidir:

- **Segurança de passageira mulher.** Ver decisão `0005`. Vai depender do resultado da pesquisa
- **Ferramenta de mapa.** Iago está avaliando. Ainda não há requisito de mapa escrito aqui
- **Retenção e exclusão de dados.** Depende da política de privacidade (LGPD)
