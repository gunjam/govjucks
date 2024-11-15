---
layout: subpage
pageid: getting-started
---

# Prise en main

## Lorsque nous utilisons Node ...

```
$ npm install govjucks
```

Une fois installé, utilisez simplement `require('govjucks')` pour le charger.

Govjucks supporte les versions de Node.js qui sont [même supportées par la
fondation Node.js](https://github.com/nodejs/Release#release-schedule1),
c’est-à-dire la version la plus récente et les unes actuellement en mode
maintenance.

## Lorsque nous sommes dans un navigateur ...

Utilisez [govjucks.js](../files/govjucks.js) ([min](../files/govjucks.min.js)) pour avoir l’intégralité de la bibliothèque ou
[govjucks-slim.js](../files/govjucks-slim.js) ([min](../files/govjucks-slim.min.js)) pour avoir une version allégée
qui fonctionne uniquement avec les templates précompilés.

### Quel fichier devez-vous utiliser ?

* Utilisez **govjucks.js** pour charger dynamiquement les templates, pour auto-recharger
  les templates quand ils sont modifiés, et pour utiliser les templates précompilés.
  Comme le fichier est livré avec le compilateur complet, il est plus volumineux (20K min/gzipped).
  Utilisez-le pour commencer et vous pouvez vous en servir en production si la taille du
  fichier ne vous dérange pas.

* Utilisez **govjucks-slim.js** pour charger et utiliser les templates précompilés. Comme
  le fichier est livré uniquement avec le runtime, il est plus petit (8K min/gzipped), mais il fonctionne
  *seulement* avec les templates précompilés. Généralement utilisé en production, il est quand même possible
  de s’en servir en développement à condition de lancer la tâche [grunt](https://github.com/jlongster/grunt-govjucks) ou [gulp](https://github.com/sindresorhus/gulp-govjucks) pour recompiler automatiquement les templates.

Il suffit d’inclure govjucks avec une balise `script` dans la page :

```html
<script src="govjucks.js"></script>
```

ou le charger comme un module AMD :

```js
define(['govjucks'], function(govjucks) {
});
```

> Quoi que vous fassiez, assurez-vous de précompiler vos templates en
> production ! Il existe des tâches [grunt](https://github.com/jlongster/grunt-govjucks)
> et [gulp](https://github.com/sindresorhus/gulp-govjucks) pour vous aider à
> faire cela. Lisez [Utilisation dans un navigateur](api.html#utilisation-dans-un-navigateur)
> pour en savoir plus sur les configurations optimales côté client.

## Utilisation

Ceci est la façon la plus simple pour utiliser Govjucks. Tout d’abord, définissez les indicateurs de configuration comme par exemple l’autoéchappement puis faites le rendu d’une chaine :

```js
govjucks.configure({ autoescape: true });
govjucks.renderString('Hello {% raw %}{{ username }}{% endraw %}', { username: 'James' });
```

Généralement, vous n’utiliserez pas `renderString`, au lieu de cela, vous devez écrire
des templates dans des fichiers individuels et utiliser `render`. De cette façon, vous pouvez
hériter et inclure des templates. Dans ce cas, vous devez dire à govjucks
où se trouvent ces fichiers templates avec le premier argument de `configure` :

```js
govjucks.configure('views', { autoescape: true });
govjucks.render('index.html', { foo: 'bar' });
```

Dans node, `'views'` serait un chemin relatif par rapport au répertoire de travail
actuel. Dans le navigateur, ce serait une URL relative et vous
voulez probablement qu’elle soit absolue, telle que `'/views'`.

En utilisant express ? Il suffit simplement de passer votre app express dans `configure` :

```js
var app = express();

govjucks.configure('views', {
    autoescape: true,
    express: app
});

app.get('/', function(req, res) {
    res.render('index.html');
});
```

L’API ci-dessus fonctionne dans node et dans le navigateur (express est seulement
dans node, évidemment). Dans node, govjucks charge les templates à partir du
système de fichiers par défaut et dans le navigateur il les charge depuis HTTP.

Si vous avez [précompilé](api.html#prcompilation) vos templates dans le navigateur, ils
seront automatiquement repris par le système et vous ne devez rien faire de
plus. Cela facilite l’utilisation du même code dans les environnements de
développement et de production, en utilisant des templates précompilés en
production.

## Plus d’informations

Ce qui précède n’est que la pointe de l’iceberg. Regardez [API](api.html) pour les docs de l’API
et [Templating](templating.html) pour le langage des templates.
