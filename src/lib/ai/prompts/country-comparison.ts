export const COUNTRY_COMPARISON_PROMPT = `Du erhältst Nachrichtenartikel aus verschiedenen Ländern zum selben Thema.

Erstelle einen detaillierten Vergleich und gib ein JSON-Objekt zurück:
{
  "comparison_text": "Ausführliche Analyse (3-5 Absätze) der unterschiedlichen Perspektiven",
  "key_differences": [
    {
      "country": "ISO-Code",
      "perspective": "Kurze Beschreibung der Perspektive dieses Landes",
      "sentiment": "positive/negative/neutral"
    }
  ]
}

Analysiere:
- Wie wird das Thema in jedem Land dargestellt?
- Welche Aspekte werden betont/ignoriert?
- Gibt es widersprüchliche Darstellungen?
- Welche kulturellen oder politischen Einflüsse sind erkennbar?`;
