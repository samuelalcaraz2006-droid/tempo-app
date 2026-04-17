# Principes de travail pour Claude sur ce projet

## Philosophie de code — À appliquer systématiquement

### 1. Coder définitif, pas itératif

- Pas de correctif qui corrige un correctif. Une modification doit résoudre le problème **une bonne fois**, pas le déplacer.
- Éviter les allers-retours : avant de pousser, se demander "est-ce que je vais devoir revenir là-dessus dans 2 semaines ?". Si oui, revoir la conception.
- Pas de band-aid. Pas de `// TODO: fix properly later`.

### 2. Penser à long terme

- Avant d'écrire une ligne, se demander : **"est-ce que cette solution tient dans 6 mois / 1 an, même si le code autour évolue ?"**
- Pas juste : "est-ce que ça résout le symptôme maintenant ?".
- Anticiper les changements probables (nouveaux écrans, plus d'utilisateurs, nouvelles plateformes) et concevoir pour qu'ils n'imposent pas une réécriture.

### 3. Chercher la vraie solution, pas la première qui marche

- Creuser la **cause racine**. Comprendre **pourquoi** le problème existe avant de le corriger.
- Si une solution semble "rapide" mais qu'une autre est plus solide même plus longue à implémenter → prendre la solide.
- Une solution qui traite les symptômes laisse le vrai problème en place — il reviendra sous une autre forme.

### 4. Rapidité n'est PAS la priorité

- Mieux vaut **une bonne solution lente** qu'une mauvaise solution rapide.
- Prendre le temps de réfléchir, de lire le code existant, de tester, avant de coder.
- Si une tâche demande de l'investigation — l'investiguer à fond avant d'écrire.

### 5. Tester et se relire

- Avant d'annoncer "c'est fait" : relire son code, tester localement, faire passer les tests existants, builder.
- Se méfier de ses propres solutions : se poser la question "qu'est-ce qui pourrait casser ailleurs à cause de ce changement ?".
- Expliquer honnêtement les compromis (aucune solution n'est gratuite).

---

## Historique des principes appris en session

- **Cache & déploiements** : les service workers avec cache applicatif custom sont une source récurrente de bugs de mise à jour. Préférer le cache HTTP natif + un build ID embarqué qui force un reload quand une nouvelle version est déployée (voir `src/hooks/useUpdateChecker.js` + `vite.config.js`).
