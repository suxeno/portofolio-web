export interface LinkedRecord { title: string; href: string; detail: string }
export interface Job { date: string; title: string; organization: string }
export interface Writing { title: string; slug: string; excerpt: string; cover: string | null; publishedAt: string | null; body: string[] }
export const writing: Writing[] = [
  { title: 'On building reliable pipelines', slug: 'reliable-pipelines', excerpt: 'A note on dependable data flows.', cover: null, publishedAt: null, body: ['Sample draft: notes on building reliable data pipelines.'] },
  { title: 'Learning from model monitoring', slug: 'model-monitoring', excerpt: 'A note on observing models over time.', cover: null, publishedAt: null, body: ['Sample draft: notes on monitoring models in production.'] },
  { title: 'Notes on data systems', slug: 'data-systems', excerpt: 'A note on designing data systems.', cover: null, publishedAt: null, body: ['Sample draft: notes on the decisions behind data systems.'] },
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

  { date: 'DEC 2023 — JUN 2024', title: 'Assistant Lecturer, Data Structure and Algorithm', organization: 'Telkom University' },

];
export const achievements: string[] = [
  '2025 — 3rd Place · National Machine Learning Competition — DINAMIKA 5.0',
  '2024 — 2nd Place · National Big Data Competition — USK Stat Explore',
  '2024 — Top 10 Finalist · National Data Analytics Competition — FT UGM',
  '2023 — Top 10 Finalist · National Statistic Infographic Competition — DINAMIKA 3.0',
];
