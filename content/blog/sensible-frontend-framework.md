---
title: "A sensible way to chose a frontend framework"
date: "2022-09-17"
---

Imagine starting a project from scratch. You will need to build a frontend, and crucially, choose how.

Here you are, facing an ocean of libraries and frameworks that can achieve almost anything you'd want, and you have to pick one.
Of course, based on the nature of the project, you might want to have fun and try something new, do some exploratory work, or you might be working in the context of a business where speed and sustainability are key.

I've been there many times, made some mistakes, and over the last few tries, I've been following a mantra that's been paying off more often than not: **It's easy to migrate, hard to eject**.

Now that sounds as generic as it gets, and it is. The core of this idea is to visualize a ladder where the lower end is the most rigid and simple, and the higher you go, the more complex it gets. I found that while it's easy to move up the ladder, it is hard to go down. In that regard, I make sure to start as low as possible for as long as possible to remove excessive work.

This imaginative ladder goes like this: **Static content < Interactivity < Computation**.

- Do you need server-side computation power (e.g. SEO)? => **Computation**.
  _Server-side rendering frameworks (NextJS, NuxtJS)_
- High data throughput? => **Interactivity**.
  _Any client-oriented library (React, Angular, Vue) or framework (CRA), SSR is a possibility too (NextJS, NuxtJS)_
- Anything else => **Static content**.
  _Static-site generators (Astro, Hugo)_

For each stage, its own set of rules and possibilities, of course, at which point I'd argue: whatever you're most comfortable with. It is software you are bound to maintain, might as well get comfy.

✌️
