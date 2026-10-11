#!/usr/bin/env bash
# Gera os áudios de uma voz em public/audio/<voz>/ usando voz neural (edge-tts, precisa de internet e uv).
# Uso: scripts/gerar-audios.sh [voz-edge-tts] [velocidade]
#   pt-BR-FranciscaNeural  -> public/audio/francisca  (feminina, padrão)
#   pt-BR-AntonioNeural    -> public/audio/antonio    (masculina)
#   pt-BR-ThalitaMultilingualNeural -> public/audio/thalita (feminina)
# Depois de criar uma voz nova, cadastre-a em VOICES (server.js) e em public/js/common.js.
set -euo pipefail

VOICE="${1:-pt-BR-FranciscaNeural}"
RATE="${2:--12%}"
SLUG="$(echo "$VOICE" | sed -E 's/^pt-BR-//; s/(Multilingual)?Neural$//' | tr '[:upper:]' '[:lower:]')"
ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/audio"
OUT="$ROOT/$SLUG"
mkdir -p "$OUT"

# Letras escritas como se fala, para a voz não ler "O" como artigo
letra_falada() {
  if   [ "$1" -le 15 ]; then echo "bê"
  elif [ "$1" -le 30 ]; then echo "i"
  elif [ "$1" -le 45 ]; then echo "ene"
  elif [ "$1" -le 60 ]; then echo "gê"
  else echo "ó"; fi
}

falar() { # texto arquivo
  uvx edge-tts --voice "$VOICE" --rate="$RATE" --text "$1" --write-media "$2" >/dev/null 2>&1
}
export -f falar letra_falada
export VOICE RATE OUT

seq 1 75 | xargs -P 8 -I{} bash -c 'falar "Letra $(letra_falada {}). Número {}." "$OUT/{}.mp3" && echo -n "."'
echo

falar "Atenção, recapitulando os números sorteados." "$OUT/recap-inicio.mp3"
falar "Esses foram todos os números sorteados." "$OUT/recap-fim.mp3"
falar "Ainda não saiu nenhum número." "$OUT/nenhum.mp3"
falar "Vamos começar um novo jogo. Boa sorte a todos!" "$OUT/novo-jogo.mp3"
falar "Olá! Esta é a voz que vai cantar os números do bingo." "$OUT/teste.mp3"

# Respostas rápidas do controle (ids iguais aos de PHRASES em server.js)
falar "Sim, já saiu!" "$OUT/sim-saiu.mp3"
falar "Não, ainda não saiu." "$OUT/nao-saiu.mp3"
falar "Atenção! Vamos conferir a cartela." "$OUT/conferir.mp3"
falar "Temos um vencedor! Parabéns!" "$OUT/vencedor.mp3"
falar "Um momento, por favor." "$OUT/aguarde.mp3"

# Sinal curto antes de cada número (igual para todas as vozes)
if [ ! -f "$ROOT/sinal.mp3" ]; then
  ffmpeg -y -loglevel error \
    -f lavfi -i "sine=frequency=880:duration=0.18" \
    -f lavfi -i "sine=frequency=1320:duration=0.35" \
    -filter_complex "[0]afade=t=out:st=0.08:d=0.1[a];[1]afade=t=out:st=0.05:d=0.3[b];[a][b]concat=n=2:v=0:a=1,volume=0.5" \
    -codec:a libmp3lame -q:a 4 "$ROOT/sinal.mp3"
fi

echo "Voz $VOICE gerada em $OUT ($(ls "$OUT" | wc -l | tr -d ' ') arquivos)"
