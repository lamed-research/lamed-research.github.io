#!/bin/bash

set -euox pipefail

OUTDIR="${1:-.}"
mkdir -p "$OUTDIR"

# Light
cat > "$OUTDIR/lamed_research.tex" <<'EOF'
\documentclass[border=4pt]{standalone}
\usepackage{fontspec}
\usepackage{xcolor}
\usepackage{graphicx}
\usepackage{calc}

\newfontfamily\mainfont{EB Garamond}
\newfontfamily\hebfont{Noto Serif Hebrew}

\newsavebox{\textblock}
\newlength{\textblockheight}
\newsavebox{\glyphbox}
\newsavebox{\titlebox}
\newlength{\titlewidth}

\begin{document}
\color{black}%

\savebox{\titlebox}{\mainfont\fontsize{54}{54}\selectfont\textsc{Lamed}}
\setlength{\titlewidth}{\wd\titlebox}

\savebox{\textblock}{%
  \begin{tabular}[b]{@{}c@{}}
    \usebox{\titlebox}\\[4pt]
    \resizebox{\titlewidth}{!}{\mainfont\fontsize{18}{18}\selectfont\addfontfeatures{LetterSpace=20.0}RESEARCH}
  \end{tabular}%
}

\setlength{\textblockheight}{\ht\textblock+\dp\textblock}
\savebox{\glyphbox}{\hebfont\fontsize{80}{80}\selectfont ל}

\resizebox{!}{\textblockheight}{\usebox{\glyphbox}}%
\hskip 14pt%
\usebox{\textblock}%

\end{document}
EOF

# Dark
cat > "$OUTDIR/lamed_research_dark.tex" <<'EOF'
\documentclass[border=4pt]{standalone}
\usepackage{fontspec}
\usepackage{xcolor}
\usepackage{graphicx}
\usepackage{calc}

\newfontfamily\mainfont{EB Garamond}
\newfontfamily\hebfont{Noto Serif Hebrew}

\newsavebox{\textblock}
\newlength{\textblockheight}
\newsavebox{\glyphbox}
\newsavebox{\titlebox}
\newlength{\titlewidth}

\begin{document}
\pagecolor[HTML]{000000}
\color{white}%

\savebox{\titlebox}{\mainfont\fontsize{54}{54}\selectfont\textsc{Lamed}}
\setlength{\titlewidth}{\wd\titlebox}

\savebox{\textblock}{%
  \begin{tabular}[b]{@{}c@{}}
    \usebox{\titlebox}\\[4pt]
    \resizebox{\titlewidth}{!}{\mainfont\fontsize{18}{18}\selectfont\addfontfeatures{LetterSpace=20.0}RESEARCH}
  \end{tabular}%
}

\setlength{\textblockheight}{\ht\textblock+\dp\textblock}
\savebox{\glyphbox}{\hebfont\fontsize{80}{80}\selectfont ל}

\resizebox{!}{\textblockheight}{\usebox{\glyphbox}}%
\hskip 14pt%
\usebox{\textblock}%

\end{document}
EOF

for name in lamed_research lamed_research_dark; do
  (cd "$OUTDIR" && xelatex -interaction=nonstopmode "${name}.tex" > /dev/null 2>&1)
  pdf2svg "$OUTDIR/${name}.pdf" "$OUTDIR/${name}.svg"
  rm -f "$OUTDIR"/${name}.{aux,log}
done
