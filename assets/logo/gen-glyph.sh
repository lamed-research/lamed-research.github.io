#!/bin/bash

set -euox pipefail

OUTDIR="${1:-.}"
mkdir -p "$OUTDIR"

# Light
cat > "$OUTDIR/lamed_glyph.tex" <<'EOF'
\documentclass[border=4pt]{standalone}
\usepackage{fontspec}
\usepackage{xcolor}
\newfontfamily\hebfont{Noto Serif Hebrew}
\begin{document}
\color{black}%
{\hebfont\fontsize{120}{120}\selectfont ל}
\end{document}
EOF

# Dark
cat > "$OUTDIR/lamed_glyph_dark.tex" <<'EOF'
\documentclass[border=4pt]{standalone}
\usepackage{fontspec}
\usepackage{xcolor}
\newfontfamily\hebfont{Noto Serif Hebrew}
\begin{document}
\pagecolor[HTML]{000000}
\color{white}%
{\hebfont\fontsize{120}{120}\selectfont ל}
\end{document}
EOF

# Light square
cat > "$OUTDIR/lamed_glyph_square.tex" <<'EOF'
\documentclass{article}
\usepackage[paperwidth=512pt,paperheight=512pt,margin=0pt]{geometry}
\usepackage{fontspec}
\usepackage{xcolor}
\newfontfamily\hebfont{Noto Serif Hebrew}
\pagestyle{empty}
\begin{document}
\color{black}%
\vspace*{\fill}
\begin{center}
{\hebfont\fontsize{280}{280}\selectfont ל}
\end{center}
\vspace*{\fill}
\end{document}
EOF

# Dark square
cat > "$OUTDIR/lamed_glyph_square_dark.tex" <<'EOF'
\documentclass{article}
\usepackage[paperwidth=512pt,paperheight=512pt,margin=0pt]{geometry}
\usepackage{fontspec}
\usepackage{xcolor}
\newfontfamily\hebfont{Noto Serif Hebrew}
\pagestyle{empty}
\begin{document}
\pagecolor[HTML]{000000}
\color{white}%
\vspace*{\fill}
\begin{center}
{\hebfont\fontsize{280}{280}\selectfont ל}
\end{center}
\vspace*{\fill}
\end{document}
EOF

for name in lamed_glyph lamed_glyph_dark lamed_glyph_square lamed_glyph_square_dark; do
  (cd "$OUTDIR" && xelatex -interaction=nonstopmode "${name}.tex" > /dev/null 2>&1)
  pdf2svg "$OUTDIR/${name}.pdf" "$OUTDIR/${name}.svg"
  rm -f "$OUTDIR"/${name}.{aux,log}
done
