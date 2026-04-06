# TEMPO — Migrations SQL

## Ordre d'exécution obligatoire

Exécutez chaque fichier dans l'ordre, un par un, dans Supabase SQL Editor.
Attendez "Success" avant de passer au suivant.

| Ordre | Fichier            | Contenu                          |
|-------|--------------------|----------------------------------|
| 1     | 001_types.sql      | Extensions et types énumérés     |
| 2     | 002_tables.sql     | Toutes les tables + index        |
| 3     | 003_functions.sql  | Fonctions et triggers            |
| 4     | 004_rls.sql        | Règles de sécurité (RLS)         |

## Règles importantes

- Ne jamais exécuter ces fichiers deux fois sur la même base.
- Ne jamais modifier ces fichiers après exécution en production.
- Pour toute modification future, créer un nouveau fichier : 005_xxx.sql

## En cas d'erreur

Si une erreur survient pendant l'exécution, notez le numéro de la migration
et le message d'erreur exact avant de tenter une correction.
Ne jamais utiliser DROP pour corriger une erreur en production.
