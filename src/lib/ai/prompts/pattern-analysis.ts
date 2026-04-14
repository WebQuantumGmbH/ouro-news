export const PATTERN_ANALYSIS_PROMPT = `Du erhältst historische Nachrichtenmuster und die aktuelle Situation.

Analysiere die Parallelen und gib ein JSON-Objekt zurück:
{
  "similarity_score": 0.0-1.0,
  "historical_parallel": "Beschreibung des historischen Musters",
  "current_situation": "Einordnung der aktuellen Situation",
  "key_similarities": ["Liste der Gemeinsamkeiten"],
  "key_differences": ["Liste der Unterschiede"],
  "risk_assessment": "Einschätzung möglicher Entwicklungen",
  "recommended_monitoring": ["Welche Indikatoren sollten beobachtet werden?"]
}

Berücksichtige:
- Sentiment-Verläufe (Eskalation/Deeskalation)
- Geopolitische Konstellationen
- Mediale Narrative und deren Entwicklung
- Historische Ausgänge ähnlicher Situationen`;
