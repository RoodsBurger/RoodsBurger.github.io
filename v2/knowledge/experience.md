---
title: Rodolfo Raimundo's Experience
url: /#about
---

## Pindrop, Research Scientist (June 2025 to present)

Rodolfo Raimundo has been a Research Scientist on Pindrop's Authentication & ID Research team since June 2025, where he is also the model risk management (MRM) team lead. Pindrop sells voice authentication and fraud detection models to banks. Rodolfo works on those voice authentication models, and with large US bank customers on implementation and on their model-risk validation of Pindrop's models, alongside Pindrop's sales engineers. Much of his recent work puts LLM agents inside research workflows. He built an agentic tool that writes model development documentation, the reports that model risk management review requires. It runs on Amazon Bedrock AgentCore and uses Claude, with modes for generating a new document, updating performance sections, refactoring text and converting to PDF.

## Pindrop: model risk management lead

As MRM team lead, Rodolfo leads Pindrop's model risk committee and writes the model development documentation for Pindrop's models, the documents bank model validators review before a model goes into production. He meets regularly with large US banks, walks their model risk, compliance and IT teams through how the models work and how to read their scores, and supports them through implementation and validation. He brought Pindrop's model documentation in line with SR 26-2, the 2026 interagency model risk guidance from the Federal Reserve, OCC and FDIC. His documentation agent is now used by all of Pindrop's research teams, so documents are standardized across products. A review agent checks every draft before a person sees it: numbers have to agree across statistics, plots, tables and text, and each number has to trace back to the script that produced it. He also built a question-answering agent for customer model-risk questions, which drafts answers for customer service from past answers and every version of the documentation, cites the document or ticket each answer comes from, and hands anything outside model risk to the research, legal or security team. A person checks every draft before it goes out.

## Pindrop articles: documentation agent and voice migration

Rodolfo's documentation agent is the subject of a bylined Pindrop article from February 2026 (pindrop.com/resources/article/agentic-ai-for-model-development-docs). The agent cut the time per document from 25 days to 8 and the work from 168 hours to 44, about 0.6 of a full-time role a year. His second bylined article, "Automating Voice Migration from Existing Audio," from August 25, 2026 (pindrop.com/resources/article/automating-voice-migration-from-existing-audio), covers voice migration. When a customer switches vendors, its existing call recordings become voice enrollments, so its callers don't have to enroll again. The job runs in parallel on AWS Batch. Rodolfo's offline enrollment work went from proofs of concept to more than 3 million enrollments across two production migrations, with under 1% of records excluded. The voice match rate went from 75% to 81.5%, agent verification time dropped from 158 to 54.5 seconds (65% less), and about 4,000 to 5,000 more calls a day were contained in the IVR.

## Pindrop, Senior Data Scientist (October 2022 to May 2024)

From October 2022 to May 2024, Rodolfo was a Senior Data Scientist on Pindrop's Authentication & ID Research team in San Francisco. He developed an authentication model built on features extracted from deep neural networks trained on spectrograms of the non-voice portion of phone-call audio. A second network, trained with a multi-task contrastive loss, re-encoded those features for the authentication task, and vectors were compared by cosine similarity. Adding the model raised customers' authentication true positive rate by 2 percentage points. Rodolfo also led a proof-of-concept tool on AWS ECR with Docker, with auto-scaling, that let Pindrop's fraud-detection customers use its authentication suite. He left in May 2024 to finish his master's degree and later came back as a Research Scientist.

## Columbia Creative Machines Lab, Graduate Research Assistant (2024 to 2025)

During his M.S. at Columbia, from October 2024 to June 2025, Rodolfo was a Graduate Research Assistant in the Creative Machines Lab, advised by Professor Hod Lipson and Dr. Yuhang Hu. He worked on the lab's knolling research line, which studies how robots can learn to arrange cluttered objects neatly. Rodolfo built the perception and manipulation side: object detection with trained YOLOv11 oriented-bounding-box models, robot control code, and a robotic arm calibration procedure, which he contributed to the lab's Knolling repository in April 2025. He then built TidyNET, his own end-to-end system that combines a diffusion model with detection and a robotic arm. The research counted as two terms of supervised research.

## Next Caller, Data Analyst (July 2021 to October 2022)

From July 2021 to October 2022, Rodolfo was a Data Analyst at Next Caller in New York. Next Caller is a Y Combinator-backed caller verification company that Pindrop acquired in 2021, so his move to Pindrop in October 2022 was an internal transition. At Next Caller, Rodolfo trained models that identify spoofed phone calls from telephony metadata. He built an AWS SageMaker training pipeline that cut training time by 40% and made monthly retraining practical. He also worked directly with bank customers: in his first month he went on site to a large US bank's call center to troubleshoot the deployment, and later, when a customer was about to leave because the integration clashed with its pipeline, he fixed how the customer consumed Next Caller's data, built Tableau and Redash dashboards showing the performance gain, and presented them, which led to a $2 million contract renewal.

## groupwork Brasil, Summer Technology Intern (June to August 2020)

In the summer of 2020, Rodolfo was a Summer Technology Intern on the SMART Automation team at groupwork Brasil, an industrial machinery company in São Paulo. He deployed an MQTT-based protocol for configuring UV-C disinfection devices, which went into use at 21 São Paulo subway stations. He worked with the subway operator's representatives on the rollout and demonstrated the software himself. He also wrote a Kotlin Android app for configuring the devices over Bluetooth and WiFi. Rodolfo's code from that period includes a multi-device UV-C disinfection system for hospital rooms, with Raspberry Pi units connecting over Bluetooth and per-room profiles that plan disinfection cycles by room type.

## Morgan Stanley, Summer Business Analyst (June to August 2019)

In the summer of 2019, Rodolfo was a Summer Analyst at Morgan Stanley in New York, as a Morgan Stanley Richard B. Fisher Scholar. He built a full-stack tool, with a Java and SQL back end and a TypeScript and Angular front end, that outperformed the legacy Enhanced Due Diligence system by 9 times. Rodolfo also implemented a PyTorch model to improve contract analysis for the Wealth Management team, his earliest documented machine learning work in industry.

## nok9, Summer Business Analyst (June to August 2016)

Rodolfo's first industry role was as a Summer Business Analyst at nok9 in Malmö, Sweden, from June to August 2016, before he started at Columbia. nok9 makes test equipment for wireless charging. Rodolfo analyzed the company's internal hardware and software testing process, presented the results, and helped introduce test-driven development and more thorough white-box testing. The role came between his technical degree in electronics at IFSP in Brazil and the start of his B.A. at Columbia in 2017.

## Earlier research and student work

Before and during his undergraduate years, Rodolfo took on several research and team roles. From April to December 2018 he was a Research Assistant at Columbia's Data Science Institute, in Professor Eugene Wu's lab (WuLab), as a 2018 Data Science Scholar, where he ran a survey on what Twitch streamers consider important for their popularity and analyzed streamers' tweets with sentiment analysis. From February 2019 to June 2020 he was Zero-G Tech Lead at the Columbia Space Initiative, on the team whose scientific payload flew on Blue Origin's New Shepard NS-12 mission. From 2019 to 2020 he co-founded and helped run the Columbia Quant Group, which hosted panels and workshops with quantitative finance professionals.

## manroland web systems, Summer Technology Analyst (June to July 2014)

Rodolfo's earliest industry experience was a summer internship in 2014 at manroland web systems, a printing press manufacturer in Augsburg, Germany, where he was a Summer Technology Analyst from June to July 2014. He was still in high school in Brazil at the time.
