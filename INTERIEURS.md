# v0.8 — Mondes intérieurs

Portes enterables : triangle jaune inversé qui flotte et tourne ; près de la porte, le message « Appuyez sur K pour entrer ». Fondu, puis changement de monde. Dans la salle, la porte de sortie a le même marqueur (« K pour sortir »).

| Porte (campus) | Monde | Photos |
|---|---|---|
| 2 portails du porche en face de Block B (bâtiment « NE court bldg ») | Bibliothèque | mondes/bibliotheque |
| portes d'Amphi 2, Amphi 6 (2 chacun), S1, S2, S3 | Amphi | mondes/amphi |
| porte « D04 » (niche du connecteur Est, côté jardin) | Salle D04 | mondes/d04 |

Code : `src/interiors/` (WorldManager, doors, library, amphi, d04, kit, textures, roomkit). Les portes sont déclarées dans les configs d'architecture avec `enter: 'library'|'amphi'|'d04'` (+ `slot`).
Debug : `?world=library|amphi|d04&slot=0` démarre directement dans un intérieur.

## v3.1 — modifications
- Bibliothèque : portes aux coins de la face latérale (fenêtres), comptoir orange sur toute la longueur entre elles.
- Amphi : entrée latérale en bas (côté scène), deux blocs de tabories avec allée centrale, tabories escaladables en sautant, éclairage adouci.
- D04 : salle agrandie (12 × 11 × 4 m), tableau « By Pahae Ras Lpota », écran = photo fournie.
  - Près du tableau : K pour écrire (vue première personne, main animée, Retour arrière efface, Échap quitte).
  - Sur une chaise de poste : K pour démarrer le PC → mot de passe `fsts@2024` → https://www.pahae.online dans une iframe (bouton « Ouvrir dans un onglet » si le site refuse l'intégration).
- Personnages supprimés, FOV de course réduit, indication « K » plus petite.

## v3.2
- Bibliothèque : comptoir élargi (une rangée de tables retirée), zone personnel derrière la vitre avec tables + PC (inaccessible) ; porte gauche ↔ coin gauche, porte droite ↔ coin droit (entrée et sortie) ; éclairage par source sous chaque luminaire.
- D04 : les deux tableaux sont inscriptibles ; PC = écran dans le moniteur 3D (sans barre des tâches) ; rangée unique de PC contre les fenêtres du mur est ; placard de fer + serveur dans le coin ; table blanche devant la chaise bleue ; éclairage révisé.

## v3.3
- PC D04 : caméra plus proche, de face, cadre du moniteur visible. Comptoir orange fermé aux deux extrémités. Petit kiosque blanc (2×2 m, vitre noire opaque) dans le coin nord-ouest de la bibliothèque.

## v4.0 — Buvette
- Entrée : porte vitrée du milieu de la façade de la Buvette (K pour entrer / sortir).
- Caisse (3apdlah) : K → menu (↑↓ produit, ←→ quantité, K valider) → tickets (1, 2, 3, 4, 5, 7 dh, nombre minimal).
- Comptoir (opama) : K → donne les tickets, reçoit les produits (affichés dans le badge en haut à droite).
- Billard : K près d'une des 3 tables → 8-ball contre l'ordinateur (← → viser, K jauge puis K frapper, Échap quitter). Règles : table ouverte, groupes, faute = blanche en main, victoire/défaite sur la 8.

## v4.1 — Buvette (corrections)
- Salle 17 × 27 m ; entrée sur le mur ouest à côté de la caisse (Coca à gauche de la porte) ; caisse dans le coin nord-ouest ; comptoir au niveau du mur avec la salle de service visible derrière (opama) ; 3 grandes fenêtres sol-plafond sur le mur sud ; 2 billards verticaux au fond.
- Billard « golvazer » : 7 jaunes, 7 rouges, 1 noire ; faute = 2 coups pour l'adversaire + blanche en main.
- Porte extérieure sur la face du boulevard (côté est de la Buvette).

## v4.2
- Buvette : façade inchangée, seulement le triangle d'entrée devant la face du boulevard (K pour entrer).
- Golvazer : blanche empochée = 2 coups pour l'adversaire + blanche posée dans le premier quart de la table (ligne jaune) ; toucher d'abord une balle adverse = 2 coups.

## v8
- **Terrain de foot** : porte (marqueur ▼ + K) dans la clôture du mini‑terrain, à côté du poteau d'éclairage le plus proche. Monde `foot` (`src/interiors/foot.js`) : pelouse, lignes, 2 buts avec filets, clôture. Ballon : courez dedans pour dribbler, **K** pour tirer (aide à la visée vers le but), « BUT ! » + compteur, remise au centre.
- **Couloirs des Blocks A–D** : poteaux/poutres du cloître (matériau `graphite`) passés du gris foncé au beige.
- **Écran D04** : image `public/textures/d04-screen.jpg` (bg-ecran.jpg, 16:10). Devant l'écran, **K** le démarre : barre latérale à droite avec les vidéos de `public/vids/` (↑/↓ + K/Entrée ou clic, Espace pause, Échap quitte).
- Vidéos : déposez vos fichiers `.mp4/.webm` dans `public/vids/` puis relancez `npm run dev` / `npm run build` (ou `npm run vids`) : `index.json` est régénéré automatiquement.

## v8.1
- Terrain de foot : la porte de sortie est du même côté et à la même position que la porte d'entrée.
- Buvette : triangle d'entrée décalé d'environ 1,9 m vers la gauche (devant la 2e porte).
- Écran D04 : la vidéo est affichée telle quelle (sans éclairage ni correction de luminosité). Bouton « Lumière » dans la barre latérale (ou touche **L**) pour éteindre/allumer la salle ; la lumière revient en quittant l'écran.
