export const SENTIMENT_PROMPT = `Analysiere den folgenden Nachrichtenartikel und bewerte das Sentiment.

Gib ein JSON-Objekt zurück mit:
- "score": Float von -1.0 (sehr negativ) bis +1.0 (sehr positiv)
- "label": Eines von "very_negative", "negative", "neutral", "positive", "very_positive"
- "emotional_tone": Objekt mit Werten 0.0-1.0 für: anger, fear, joy, sadness, surprise, disgust

Berücksichtige:
- Den Gesamtton des Artikels
- Die verwendete Sprache und Wortwahl
- Implizite und explizite Bewertungen`;

export const POLITICAL_PROMPT = `Analysiere die politische Ausrichtung des folgenden Nachrichtenartikels.

Gib ein JSON-Objekt zurück mit:
- "score": Float von -1.0 (extrem links/progressiv) bis +1.0 (extrem rechts/konservativ)
- "label": Eines von "far_left", "left", "center_left", "center", "center_right", "right", "far_right"

Berücksichtige:
- Die Quellenperspektive
- Verwendete Frames und Narratives
- Welche Themen betont/ignoriert werden`;

export const FACTUALITY_PROMPT = `Bewerte den Wahrheitsgehalt und die Faktentreue des folgenden Nachrichtenartikels.

Gib ein JSON-Objekt zurück mit:
- "score": Float von 0.0 (nachweislich falsch) bis 1.0 (verifiziert/faktentreu)
- "label": Eines von "false", "likely_false", "uncertain", "likely_true", "verified"

Berücksichtige:
- Werden Quellen genannt?
- Sind Behauptungen überprüfbar?
- Gibt es offensichtliche Übertreibungen oder Auslassungen?
- Ist der Ton sachlich oder emotionalisierend?`;

export const ENTITY_PROMPT = `Extrahiere die wichtigsten Entitäten aus dem folgenden Nachrichtenartikel.

Gib ein JSON-Objekt zurück mit:
- "persons": Array von genannten Personen (vollständige Namen)
- "places": Array von genannten Orten/Ländern
- "organizations": Array von genannten Organisationen/Institutionen`;

export const TOPIC_PROMPT = `Identifiziere die Hauptthemen des folgenden Nachrichtenartikels.

Gib ein JSON-Objekt zurück mit:
- "topics": Array von 1-5 Themen als kurze Begriffe (z.B. "Klimaschutz", "Ukraine-Krieg", "Wirtschaftspolitik")
- "country_relevance": Objekt mit ISO-Ländercodes als Keys und Relevanz (0.0-1.0) als Values

Fokussiere auf übergeordnete Themen, nicht auf Details.`;

export const SUMMARY_PROMPT = `Erstelle eine prägnante Zusammenfassung des folgenden Nachrichtenartikels in 2-3 Sätzen.
Die Zusammenfassung soll die Kernaussage, die wichtigsten Fakten und den Kontext enthalten.
Antworte nur mit der Zusammenfassung, kein JSON.`;
