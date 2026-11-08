export interface LinkedRecord { title: string; href: string; detail: string }
export interface Job { date: string; title: string; organization: string }
export const writing: LinkedRecord[] = [
  { title: 'Storing and Analyzing Data by Using Amazon Redshift', href: 'https://medium.com/@arvinantobahtiar/storing-and-analyzing-data-by-using-amazon-redshift-faf3e939299b', detail: 'JUN 2024' },
  { title: 'On building reliable pipelines', href: 'https://medium.com/@arvinantobahtiar', detail: 'Draft / Preview' },
  { title: 'Learning from model monitoring', href: 'https://medium.com/@arvinantobahtiar', detail: 'Draft / Preview' },
];
export const projects: LinkedRecord[] = [
  { title: 'Drowsiness detection camera', href: 'https://github.com/Capstone-Fatigue-Detection-Camera/Modelling', detail: 'Collaborative capstone: offline Android application using MediaPipe Face Mesh and a GRU model to explore driver-fatigue detection.' },
  { title: 'Anime recommendation', href: 'https://github.com/suxeno/Anime-Recommendation-System-Kmeans-Clustering', detail: 'Content-based recommendations using text preprocessing and K-means clustering.' },
  { title: 'Hate speech classification', href: 'https://github.com/suxeno/HateSpeech-Abusive-Text-multilabel-classification', detail: 'Multilabel classification of Indonesian text using pretrained IndoBERT.' },
];
export const experience: Job[] = [
  { date: 'JUL 2026 — PRESENT', title: 'Data Engineer', organization: 'StickEarn' },
  { date: 'JUL — SEP 2025', title: 'Data Engineer', organization: 'Eratani' },
  { date: 'SEP — DEC 2024', title: 'Business Intelligence', organization: 'StickEarn' },
  { date: 'DEC 2023 — JUL 2024', title: 'Academic Office Student Staff', organization: 'Telkom University' },
  { date: 'DEC 2023 — JUN 2024', title: 'Assistant Lecturer, Data Structure and Algorithm', organization: 'Telkom University' },
  { date: 'APR — JUL 2023', title: 'Data Engineer Virtual Internship', organization: 'id/x partners' },
];
export const achievements: string[] = [
  '2025 — 3rd Place · National Machine Learning Competition — DINAMIKA 5.0',
  '2024 — 2nd Place · National Big Data Competition — USK Stat Explore',
  '2024 — Top 10 Finalist · National Data Analytics Competition — FT UGM',
  '2023 — Top 10 Finalist · National Statistic Infographic Competition — DINAMIKA 3.0',
];
