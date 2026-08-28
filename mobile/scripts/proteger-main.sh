#!/usr/bin/env bash
#
# Protege a branch main via ruleset do GitHub.
#
#   bash scripts/proteger-main.sh
#
# Pode rodar quantas vezes quiser. Se o GitHub Pro ainda não tiver
# sincronizado na conta, o script avisa e sai sem fazer nada, então dá pra
# tentar de novo amanhã. Se a proteção já existir, ele também não duplica.
#
# O que passa a valer quando aplicar:
#   - merge só por pull request, com 1 aprovação
#   - CI verde é obrigatório
#   - conversa de revisão precisa estar resolvida
#   - force push e exclusão da main ficam bloqueados
#   - aprovação some se novos commits chegarem depois dela
#
# O owner continua podendo contornar em emergência, porque um time de quatro
# pessoas sem ninguém para desbloquear trava de vez num sábado à noite.

set -euo pipefail

REPO="${1:-iagorp6/Uroute}"
NOME="Protecao da main"
CHECK="Tipos, lint e testes"   # nome do job em .github/workflows/ci.yml

# ── Confere se dá pra ligar ─────────────────────────────────────────────────
#
# Proteção de branch é recurso pago em repositório privado. Sem Pro, a API
# responde 403 e qualquer POST daqui pra frente falharia com uma mensagem
# bem menos clara que esta.

if ! resposta=$(gh api "repos/${REPO}/rulesets" 2>&1); then
  if grep -q "Upgrade to GitHub Pro" <<<"${resposta}"; then
    echo "O GitHub Pro ainda não está ativo em ${REPO}."
    echo
    echo "O Student Developer Pack já foi aprovado, mas os benefícios levam um"
    echo "tempo pra sincronizar na conta. Não há nada a fazer além de esperar."
    echo "Rode este script de novo mais tarde."
    echo
    echo "Enquanto isso, o freio local continua valendo:"
    echo "  git config core.hooksPath .githooks"
    exit 0
  fi
  echo "Falhou ao consultar ${REPO}:" >&2
  echo "${resposta}" >&2
  exit 1
fi

# ── Não duplica ─────────────────────────────────────────────────────────────

# Usa o --jq do gh, que é embutido. `jq` solto não costuma existir no
# Git Bash do Windows, que é onde metade do time roda isto.
if gh api "repos/${REPO}/rulesets" --jq '.[].name' 2>/dev/null | grep -Fxq "${NOME}"; then
  echo "A proteção \"${NOME}\" já existe em ${REPO}. Nada a fazer."
  gh api "repos/${REPO}/rulesets" --jq '.[] | "  \(.name): \(.enforcement)"'
  exit 0
fi

echo "GitHub Pro ativo. Aplicando ruleset em ${REPO}..."

gh api "repos/${REPO}/rulesets"   --method POST   --input - <<JSON
{
  "name": "${NOME}",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "conditions": {
    "ref_name": { "include": ["refs/heads/main"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge", "squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "${CHECK}" }]
      }
    }
  ]
}
JSON

echo
echo "Pronto. Conferindo:"
gh api "repos/${REPO}/rulesets" --jq '.[] | "  \(.name): \(.enforcement)"'

echo
echo "Falta fazer na interface (nao tem API estavel):"
echo "  Settings > Actions > General > Fork pull request workflows"
echo "    marque 'Require approval for all external contributors'"
echo "  Sem isso, PR de fork roda workflow no seu repositorio sem voce olhar."
