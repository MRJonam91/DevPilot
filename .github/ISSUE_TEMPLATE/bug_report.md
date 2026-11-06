name: Segnalazione bug / Bug report
description: Segnala un malfunzionamento o comportamento inatteso
labels: [bug]
body:
  - type: markdown
    attributes:
      value: Grazie per aiutarci a migliorare DevPilot!
  - type: textarea
    id: what-happened
    attributes:
      label: Descrizione del problema / Description
      description: Cosa è successo esattamente? / What happened?
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Passi per riprodurre / Steps to reproduce
      description: Includi comando CLI, file di input o git commit / CLI command, files, git commits
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Versione Node e DevPilot / Node and DevPilot version
      placeholder: Node 22.x / DevPilot 1.0.0
    validations:
      required: true
