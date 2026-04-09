# Registre des traitements de donnees personnelles — TEMPO

Conformement a l'article 30 du RGPD, ce registre recense l'ensemble des traitements de donnees a caractere personnel effectues par TEMPO.

**Responsable du traitement** : TEMPO SAS, [adresse], contact@tempo-app.fr
**DPO** : dpo@tempo-app.fr
**Date de mise a jour** : avril 2026

---

## 1. Authentification et gestion des comptes

| Champ | Detail |
|-------|--------|
| **Finalite** | Permettre l'inscription, la connexion et la gestion du compte utilisateur |
| **Base legale** | Execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Travailleurs, entreprises, administrateurs |
| **Donnees traitees** | Email, mot de passe (hashe), role, date de creation |
| **Destinataires** | Supabase Auth (sous-traitant) |
| **Transfert hors UE** | Non (Supabase EU) |
| **Duree de conservation** | 3 ans apres derniere connexion |
| **Mesures de securite** | Hashage bcrypt, JWT, HTTPS, RLS |

## 2. Profil et informations personnelles

| Champ | Detail |
|-------|--------|
| **Finalite** | Constituer le profil utilisateur pour le matching et la facturation |
| **Base legale** | Execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Travailleurs, entreprises |
| **Donnees traitees** | Nom, prenom, ville, telephone, competences, certifications, photo profil |
| **Destinataires** | Interne TEMPO, entreprises (profil visible lors du matching) |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 3 ans apres derniere connexion, anonymisation a la suppression |
| **Mesures de securite** | RLS par role, chiffrement au repos |

## 3. Verification d'identite (KYC)

| Champ | Detail |
|-------|--------|
| **Finalite** | Verifier l'identite et la conformite legale des travailleurs |
| **Base legale** | Obligation legale (art. 6.1.c) — lutte contre le travail dissimule |
| **Categories de personnes** | Travailleurs |
| **Donnees traitees** | Piece d'identite (CNI/passeport), SIRET, attestation RC Pro, attestation sur l'honneur |
| **Destinataires** | Administrateurs TEMPO (verification manuelle), API INSEE (verification SIRET) |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 5 ans apres derniere mission |
| **Mesures de securite** | Bucket Supabase Storage avec RLS, acces admin uniquement |

## 4. Missions et matching

| Champ | Detail |
|-------|--------|
| **Finalite** | Mettre en relation entreprises et travailleurs pour des missions temporaires |
| **Base legale** | Execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Travailleurs, entreprises |
| **Donnees traitees** | Missions (titre, lieu, taux, competences requises), candidatures, scores de matching, geolocalisation (ville) |
| **Destinataires** | Entreprises (candidatures), travailleurs (missions) |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 3 ans apres fin de mission |
| **Mesures de securite** | RLS, index optimises |

## 5. Contrats et signatures

| Champ | Detail |
|-------|--------|
| **Finalite** | Generer et signer les contrats de prestation de service |
| **Base legale** | Execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Travailleurs, entreprises |
| **Donnees traitees** | Contrats (parties, montants, dates, signatures) |
| **Destinataires** | Parties au contrat, admin TEMPO |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 10 ans (obligation comptable) |
| **Mesures de securite** | Bucket Storage avec RLS |

## 6. Paiements et facturation

| Champ | Detail |
|-------|--------|
| **Finalite** | Traiter les paiements entre entreprises et travailleurs |
| **Base legale** | Execution du contrat (art. 6.1.b) + obligation legale comptable (art. 6.1.c) |
| **Categories de personnes** | Travailleurs, entreprises |
| **Donnees traitees** | Montants, factures, identifiants Stripe (account_id, customer_id, payment_intent_id) |
| **Destinataires** | Stripe (sous-traitant PCI-DSS) |
| **Transfert hors UE** | Stripe Europe (Irlande) — pas de transfert hors UE |
| **Duree de conservation** | 10 ans (obligation comptable art. L123-22 Code de commerce) |
| **Mesures de securite** | Stripe tokenization, aucune donnee carte stockee par TEMPO |

## 7. Messagerie

| Champ | Detail |
|-------|--------|
| **Finalite** | Permettre la communication entre travailleurs et entreprises |
| **Base legale** | Execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Travailleurs, entreprises |
| **Donnees traitees** | Messages texte, horodatage |
| **Destinataires** | Expediteur et destinataire uniquement (RLS) |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 1 an |
| **Mesures de securite** | RLS, chiffrement TLS |

## 8. Notifications

| Champ | Detail |
|-------|--------|
| **Finalite** | Informer les utilisateurs des evenements pertinents |
| **Base legale** | Interet legitime (art. 6.1.f) |
| **Categories de personnes** | Tous utilisateurs |
| **Donnees traitees** | Type de notification, titre, corps, horodatage, statut de lecture |
| **Destinataires** | Utilisateur concerne uniquement |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 6 mois |
| **Mesures de securite** | RLS |

## 9. Evaluations et notations

| Champ | Detail |
|-------|--------|
| **Finalite** | Permettre l'evaluation mutuelle apres une mission |
| **Base legale** | Interet legitime (art. 6.1.f) |
| **Categories de personnes** | Travailleurs, entreprises |
| **Donnees traitees** | Note (1-5), commentaire, identite de l'evaluateur |
| **Destinataires** | Visible publiquement (note moyenne), commentaire visible par l'evalue |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 3 ans |
| **Mesures de securite** | RLS |

## 10. Audit et logs administratifs

| Champ | Detail |
|-------|--------|
| **Finalite** | Tracabilite des actions administratives (KYC, moderation) |
| **Base legale** | Interet legitime (art. 6.1.f) + obligation legale |
| **Categories de personnes** | Administrateurs |
| **Donnees traitees** | Admin ID, action, utilisateur cible, raison, horodatage |
| **Destinataires** | Administrateurs TEMPO |
| **Transfert hors UE** | Non |
| **Duree de conservation** | 5 ans |
| **Mesures de securite** | Table en lecture seule pour les non-admins |

---

## Sous-traitants

| Sous-traitant | Pays | Finalite | Garanties |
|---------------|------|----------|-----------|
| Supabase Inc. | UE (Londres) | Hebergement, BDD, Auth, Storage | DPA signe, chiffrement au repos |
| Stripe Payments Europe Ltd | UE (Irlande) | Paiements | PCI-DSS Level 1, DPA signe |
| Vercel Inc. | US | Hebergement frontend | Clauses contractuelles types (SCC) |
| API INSEE / data.gouv.fr | FR | Verification SIRET | Donnees publiques |
