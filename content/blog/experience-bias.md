---
title: "The experience bias"
date: "2023-01-17"
---

In the journey to shipping this website, I've made it a mission to keep things painfully stupid.
It worked exceptionally well when iterating on the tech stack _([hugo](https://gohugo.io/))_, design _([pure css](https://purecss.io/))_, automation _([github actions](https://docs.github.com/en/actions))_... but then came the time I had to deploy all this.

When I think of deploying a static website, my experience screams AWS S3 + Cloudfront + Route 53.
Thing is, I even developed a [terraform module](https://github.com/marc-mrt/infrastructure-modules/tree/master/modules/aws_static_website) that sets this up in a tidy module, so all I needed to do is `terraform apply` it, literally.

When it comes to terraform, modules as simple as this one are pretty straightforward to manage, the only real requirement is a place to persist its state & variables. My setup in itself was simple, a private repository that makes use of the said module, defining its variables and a matching S3 bucket to persist its state (useful when working from multiple devices).

Easy, right?

Well, here I am, my infrastructure all set up, creating an IAM user to grant access to my CI and push the static assets to the matching S3 bucket, and it hits me: wasn't this supposed to be stupid? As far as I could reason, I was erring on the opposite side of stupidity, what seemed attractive at first when taking advantage of my experience, felt like a burden to see through.

Time to take a step back, and read a bit. One afternoon, I come across [GitHub Pages](https://pages.github.com/), something I've only ever heard of in the context of OSS documentation websites, which felt legitimate to give it away for free then. As it turns out, that thing is free so long as the repository is public! Reading some more, I came to realize all of this can be automated as easily as uploading an artifact via a [GitHub Action](https://github.com/actions/upload-pages-artifact)!

30 minutes later, most of which was spent tying my custom domain to GitHub pages, I was all set up, that's more my kind of stupid!

I called this the "experience bias" because it seemed fitting, although it is really about me fighting the urge to use something I created when it might not be the right thing to do.

✌️
