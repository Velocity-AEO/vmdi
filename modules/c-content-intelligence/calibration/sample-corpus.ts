export interface CorpusSample {
  id: string;
  content: string;
  expectedVerdict: "human" | "ai";
  notes: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HUMAN-WRITTEN SAMPLES (15)
// Varied styles: conversational, professional, first-person,
// imperfect grammar, contractions, named examples, real data.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const HUMAN_SAMPLES: CorpusSample[] = [
  {
    id: "human-01",
    expectedVerdict: "human",
    notes: "Conversational first-person blog post with contractions, short fragments, named tools",
    content: `I broke our entire site's indexing last Tuesday. Not a little break — a catastrophic, zero-pages-indexed, Google-Search-Console-screaming kind of break. Here's what happened.

We'd been running Screaming Frog crawls weekly for about six months. Standard stuff. But when I pushed a redirect update through our Cloudflare Workers script, I accidentally set every page to return a 302 instead of a 301. Didn't notice for nine days.

By the time Sarah from our SEO team pinged me on Slack — "hey, why did our indexed page count drop from 4,200 to 11?" — the damage was done. Google had de-indexed almost everything. Nine days of 302s told Google these weren't permanent moves, so it just... stopped trusting the new URLs entirely.

The fix itself took twenty minutes. Changed the status codes back to 301, resubmitted the sitemap, and used the URL Inspection tool to manually request indexing on our top 50 pages. But recovery? That took almost three weeks. We didn't hit our previous indexed count until March 14th.

Lessons I actually learned from this (not the ones you'd read in a textbook): test redirects in staging first, always. Set up a Google Search Console alert for indexed page drops greater than 10%. And maybe don't push infrastructure changes at 4:47 PM on a Friday. That last one's more of a life lesson.

The real takeaway isn't technical. It's that SEO damage happens fast and recovers slow. A nine-day mistake cost us three weeks of organic traffic. Our revenue from organic dropped 34% that month.`,
  },
  {
    id: "human-02",
    expectedVerdict: "human",
    notes: "Professional but warm agency-style post with specific client data",
    content: `We ran a structured data audit for a mid-size ecommerce client last quarter — 12,000 SKUs across a Shopify Plus store — and the results genuinely surprised us. Their rich snippet appearance rate went from 3% to 41% in eight weeks. Here's the breakdown.

The store had Product schema on every PDP, which sounds fine until you look closer. Half the pages were missing the "offers" property, about 2,100 had price set to "0.00" because of a Liquid template bug, and none of them included the "review" aggregate. Google was basically ignoring all of it.

We fixed this in three passes. First, we corrected the Liquid template so prices pulled from the variant object instead of the product-level field. Second, we added AggregateRating by pulling their Yotpo review data into the schema block. Third — and this one's easy to overlook — we added the "brand" property. Google's documentation doesn't say it's required, but we've seen it correlate with higher rich snippet rates across maybe a dozen clients now.

Eight weeks post-deploy, their Search Console showed rich results on 41% of indexed product pages. CTR on those pages averaged 4.8%, up from 2.1%. We can't attribute all of that to schema alone, obviously. They also launched a sale during that window. But the trend held even after the sale ended.

One thing we'd do differently: validate with Google's Rich Results Test before deploying, not after. We caught three edge cases in week two that could've been caught on day one.`,
  },
  {
    id: "human-03",
    expectedVerdict: "human",
    notes: "Opinionated thought piece, sentence fragments, rhetorical question, informal tone",
    content: `Core Web Vitals are supposed to matter for rankings. Google's said so. Repeatedly. But after spending the last 18 months optimizing CWV for clients across healthcare, SaaS, and ecommerce, I'm starting to wonder how much they actually move the needle.

Don't get me wrong — I'm not saying page speed doesn't matter. Slow pages lose users. That's just physics. But the ranking signal? It's weak. Really weak.

Here's what we've seen. We took a B2B SaaS site from an LCP of 4.8 seconds down to 1.2 seconds. Beautiful improvement. Their CLS went from 0.31 to 0.04. INP wasn't even measurable before; now it's 120ms. Textbook green scores across the board. Rankings? Moved maybe 1-2 positions on 10% of their tracked keywords. Organic traffic didn't change in any statistically meaningful way for three months.

Meanwhile, a competitor with garbage CWV scores — we're talking LCP over 6 seconds, CLS of 0.4 — continued to outrank them on 73% of shared keywords. Why? Better content. More backlinks. Stronger topical authority. The fundamentals.

I still optimize CWV for every client. The user experience benefits are real, bounce rates do drop, and conversion rates do climb. Those are worth it on their own. But if someone tells you CWV is a major ranking factor, ask them for the data. I've got 18 months of it, and it tells a different story.

The takeaway: fix your Core Web Vitals because your users deserve fast pages. Just don't expect it to be an SEO silver bullet.`,
  },
  {
    id: "human-04",
    expectedVerdict: "human",
    notes: "Technical tutorial style, specific code references, casual asides",
    content: `Setting up hreflang tags incorrectly is one of those mistakes that won't crash your site or throw errors — it'll just quietly tank your international traffic for months while you wonder what went wrong. I've cleaned up hreflang messes for three different enterprise clients this year, and the same mistakes keep coming up.

The big one: self-referencing hreflang tags. Every page needs to include a tag pointing to itself. Sounds redundant, but skip it and Google can't confirm the relationship. I see this missing on probably 60% of the international sites we audit.

Second problem: using the wrong language codes. It's "en-GB", not "en-UK". It's "zh-Hans", not "zh-CN" (well, "zh-CN" works but it's the region variant, not the script variant — and if you're targeting simplified Chinese speakers in Singapore, you want the script). We had a client whose entire Japanese site was tagged as "jp" instead of "ja". Country code, not language code. Google just ignored all of it.

Third, and this one's sneaky: inconsistent return links. If page A in English says "my French equivalent is page B", then page B in French must say "my English equivalent is page A." If page B points somewhere else, or doesn't have hreflang at all, the whole thing breaks. We built a Python script using Screaming Frog's API to crawl both versions and flag mismatches — saved us probably 40 hours of manual checking on a 9,000-page site.

Quick sanity check you can do right now: pull up any page on your international site, view source, search for "hreflang". Count the tags. You should see one for every language version plus one for the page you're on. If you don't, that's your starting point.`,
  },
  {
    id: "human-05",
    expectedVerdict: "human",
    notes: "Data-heavy analysis with tables described in text, specific percentages",
    content: `We analyzed 847 blog posts published by our clients between January and September 2025 to figure out which content formats actually drive organic traffic six months post-publish. The results changed how we plan content calendars.

The short version: long-form comparison posts ("X vs Y") and original research pieces outperformed everything else by a wide margin. How-to guides — the thing every SEO blog tells you to publish — landed in the middle of the pack.

Here are the numbers. Comparison posts (we had 94 of them) averaged 2,340 organic sessions per month at the six-month mark. Original research posts (61 total) averaged 1,870. How-to guides (312 of them, our biggest category) averaged 890. Listicles came in at 640. And "ultimate guides" — those 5,000-word monsters that take forever to produce — averaged just 720. Not great ROI when you factor in production time.

Why do comparison posts perform so well? Our theory: they capture bottom-funnel search intent. Someone searching "Ahrefs vs SEMrush" is closer to a purchase decision than someone searching "what is keyword research." The content naturally includes both brand names, which helps with long-tail queries too.

The original research angle is more obvious. Nobody else has your data. When we published a study on crawl budget waste (we analyzed server logs from 23 sites), it earned 84 backlinks in three months without any outreach. Try getting that with a how-to guide about meta descriptions.

We're not saying stop publishing how-to content. It has its place. But if you're only publishing how-tos, you're leaving the highest-performing formats on the table.`,
  },
  {
    id: "human-06",
    expectedVerdict: "human",
    notes: "Case study with narrative arc, team mentions, specific timeline",
    content: `Last November, we took over SEO for a regional law firm that had been penalized — not algorithmically, but with an actual manual action in Search Console. Someone on their previous agency had built about 400 links from PBNs, guest post farms, and a handful of sites that were basically link directories with AI-generated content. Classic stuff.

The manual action had been sitting in their Search Console for seven months. The previous agency never told them about it. The firm found out when a partner Googled themselves and couldn't find their own website. That's how we got the call.

Our link audit took two weeks. We used Ahrefs, exported every backlink (about 14,000 total), and graded them. The breakdown: roughly 11,200 were fine — directories, local citations, legitimate press mentions. About 2,400 were questionable. And 400-ish were clearly toxic — the PBN links, the guest post spam, a few from hacked WordPress sites.

We filed the disavow on December 3rd. Submitted the reconsideration request the same day. Google rejected it on December 19th — they wanted us to show we'd attempted to remove links, not just disavow them. Fair enough. We spent Christmas week sending removal requests to every webmaster we could find an email for. Got maybe 30% of them actually removed.

Second reconsideration request went in January 8th. Approved January 22nd. The firm's homepage was back on page one for their primary keyword within six days of the penalty lift. Most of their practice area pages recovered within three weeks.

Total timeline from engagement to recovery: about 11 weeks. The partners were patient, which helped. Not every client handles a two-month "we're fixing it, just trust us" window that well.`,
  },
  {
    id: "human-07",
    expectedVerdict: "human",
    notes: "Quick practical tips, very short paragraphs, direct voice",
    content: `Robots.txt mistakes that are costing you traffic right now — and yeah, I'm assuming you've got at least one of these because almost everyone does.

Check your staging site. Go look at robots.txt on your staging or dev subdomain. If it says "Disallow: /" that's correct. But if you ever migrated from staging to production by copying files over, that disallow might have come along for the ride. I've seen this happen on three separate site migrations this year. Production site, fully blocked from crawling, nobody noticed for weeks. Pull up yourdomain.com/robots.txt and check. Takes five seconds.

Now check your trailing slashes. "Disallow: /admin" and "Disallow: /admin/" are different. The first one blocks anything starting with /admin, including /admin-dashboard and /administration-settings. The second one only blocks the /admin/ directory. If you're trying to block a directory, use the trailing slash. If you're seeing weird pages getting de-indexed, this might be why.

The sitemap reference. Your robots.txt should include a Sitemap: line pointing to your XML sitemap. It's not required, but Google's own documentation recommends it, and we've seen crawl efficiency improve after adding it. Takes one line. No reason not to.

Crawl-delay directives. Googlebot ignores crawl-delay entirely — it's not part of their spec. If you've got "Crawl-delay: 10" in there thinking it's protecting your server from Google, it's not doing anything for Google. Bingbot does respect it though, so maybe keep it if Bing traffic matters to you. For most of our clients, it doesn't.

Wildcard patterns. You can use * in robots.txt paths. "Disallow: /*?sort=" blocks any URL with a sort parameter. Super useful for faceted navigation on ecommerce sites. We used this on a Magento store to block 180,000 filter combination URLs from being crawled. Index bloat dropped 74% in two weeks.`,
  },
  {
    id: "human-08",
    expectedVerdict: "human",
    notes: "Industry commentary, strong opinions, conversational contractions throughout",
    content: `I'm going to say something that might get me uninvited from SEO Twitter: most technical SEO audits are a waste of time. Not because technical SEO doesn't matter — it does. But because the audit format itself is broken.

Here's what usually happens. Agency runs Screaming Frog, exports a spreadsheet with 200 issues, ranks them by "priority" (which really means "how easy they are to explain"), and delivers a PDF that nobody reads. Client nods, says thanks, implements maybe 10% of the recommendations over the next six months. Agency runs another audit. Finds 180 issues because the 200 from last time were never fixed and 20 new ones appeared.

We stopped doing traditional audits in 2024. Instead, we run what we call "impact sprints" — two-week blocks where we pick the three technical issues most likely to move traffic, fix them ourselves (we have dev access for most clients), and measure the result. That's it.

In Q1 2025, we ran 14 impact sprints across eight clients. Average organic traffic lift: 11%. Best case was 23% for a SaaS client where we fixed a canonicalization mess — 3,400 pages pointing canonical to the wrong URL. Worst case was 2%, but that client's site was already technically clean. The remaining lift had to come from content.

The key insight isn't that audits are bad. It's that audits without implementation are worthless. And most companies don't have the engineering bandwidth to implement 200 recommendations. They can handle three. So give them the three that'll actually move numbers.

We still use audit tools. Screaming Frog, Sitebulb, Chrome DevTools, Search Console — all essential. But the deliverable isn't a list anymore. It's results.`,
  },
  {
    id: "human-09",
    expectedVerdict: "human",
    notes: "Personal narrative, learning-from-failure tone, specific dollar amounts",
    content: `The most expensive SEO mistake I ever made cost a client roughly $43,000 in lost revenue over two months. It was a noindex tag on their product category pages, and I put it there on purpose. Let me explain.

The client ran an outdoor gear ecommerce store. About 2,800 products across 140 category pages. Their category pages had thin content — just product grids with no text — and I was worried about Google's thin content guidelines. My solution: noindex the category pages, let the individual product pages carry the SEO weight.

It made sense in theory. In practice, those category pages were ranking for their highest-volume commercial keywords. "Hiking boots," "camping tents," "waterproof jackets" — all category pages, all page one. I noindexed them on a Thursday. By the following Wednesday, they'd disappeared from search results entirely. Organic revenue dropped from an average of $780/day to about $340/day.

I caught it because I'd set up daily revenue alerts in Google Analytics. Noticed the drop on day five, traced it back to the noindex change, reverted it within an hour. But re-indexing took almost three weeks for all 140 pages. Some of them lost their previous positions permanently — we never got "camping tents" back to position 3. It hovers around 7-8 now.

What I should've done instead: add unique content to the category pages. Product descriptions, buying guides, FAQ sections. That addresses the thin content concern without removing the pages from the index. We ended up doing exactly that in January, and those pages now outperform their pre-noindex rankings by about 15%.

The lesson cost $43,000 but I've never made that particular mistake again. And now I tell every junior SEO on my team: before you noindex anything, check what it's currently ranking for. Always.`,
  },
  {
    id: "human-10",
    expectedVerdict: "human",
    notes: "Local SEO focus, step-by-step but informal, specific tool names",
    content: `Google Business Profile optimization is one of those things where 80% of the work takes 20 minutes and the other 20% takes forever. If you're a local business and haven't touched your GBP in a while, here's what actually moves the needle based on what we've done for 60+ local clients.

First, your categories. You get one primary category and up to nine additional categories. Most businesses pick a primary and call it done. But the additional categories matter — a lot. We had a plumber who was listed as "Plumber" only. Added "Water Heater Installation Service," "Drain Cleaning Service," and "Emergency Plumber" as additional categories. His profile started showing up for an extra 43 keywords within two weeks. We tracked this through BrightLocal's rank tracker.

Photos. Google says businesses with photos get 42% more direction requests. I don't know if that exact number holds anymore, but the pattern is real. We tell clients to upload 5-10 new photos every month. Not stock photos — actual job site photos, team photos, before-and-afters. One HVAC client started posting photos of completed installations with a brief caption. Their profile views went up 28% month over month.

Reviews. You can't buy them and you shouldn't fake them. But you can make it stupid easy for happy customers to leave one. We set up automated SMS follow-ups through Podium for a dental practice — patient checks out, gets a text 2 hours later with a direct link to leave a Google review. Their review count went from 47 to 189 in four months. Average rating actually went up too, from 4.4 to 4.6.

Posts. GBP posts expire after seven days, which makes them feel pointless. They're not. Google confirmed posts factor into local ranking relevance. We post weekly for clients — usually a special offer or a quick tip related to their service. It's 15 minutes of work per week and we've consistently seen a correlation with improved local pack visibility.

The stuff that doesn't seem to matter much anymore: keyword-stuffing your business description, adding UTM parameters to your website URL, or obsessing over your exact NAP format. Focus on categories, photos, reviews, and posts. That's where the ROI is.`,
  },
  {
    id: "human-11",
    expectedVerdict: "human",
    notes: "Link building strategy post, blunt and practical, no fluff",
    content: `Link building in 2026 comes down to this: create something worth linking to, or find someone with a reason to link to you. Everything else is either spam or a waste of money. I know that sounds simplistic. It's not.

We built 340 links for clients in Q4 2025 without sending a single "I noticed you wrote about X and thought you might want to link to Y" email. Those emails don't work anymore. The response rate we tracked in 2023 was 1.2%. By mid-2025 it had dropped to 0.3%. People are tired of them.

What worked instead: original data. We published a study analyzing 5,000 404 pages across the SaaS industry — what they said, where they redirected (or didn't), how long they'd been broken. Tech journalists and SaaS bloggers picked it up naturally. 84 links from that one piece. DR range: 35 to 78. Zero outreach.

Second approach: reactive PR. When Google announced the March 2025 core update, we had a detailed analysis post live within 48 hours. We'd pre-written template sections for different update types and just filled in the specifics. That post earned 62 links in its first month, mostly from SEO blogs and marketing news sites who needed an expert source to reference.

Third: broken link building, but done differently. Instead of emailing strangers, we built relationships with 15 resource page owners in our niche over about six months. Commented on their content, shared their stuff, actually became part of their professional orbit. When we had something relevant, they were happy to add it. Not scalable? Sure. But those 15 relationships generated more links than 3,000 cold emails would have.

The economics are clear. One original research piece costs us maybe $2,000-3,000 to produce (data analysis, writing, design). It earns 50-100 links organically. One cold outreach campaign costs about the same in labor hours and earns maybe 5-10 links. The math isn't close.`,
  },
  {
    id: "human-12",
    expectedVerdict: "human",
    notes: "Technical migration guide, specific version numbers, cautious tone",
    content: `We migrated a client from HTTP to HTTPS last month. In 2026. Yes, they were still on HTTP. Before you judge — they're a 15-year-old manufacturing company with a website built on a custom CMS from 2011. The developer who built it retired in 2019 and nobody wanted to touch it.

Here's how we handled it without losing their rankings, which were actually decent. They ranked on page one for about 30 industrial manufacturing keywords, mostly long-tail stuff like "custom aluminum extrusion tolerances" that doesn't have much competition but drives their entire lead pipeline.

Step one: we got SSL certificates from Let's Encrypt. Free, auto-renewing, took about 10 minutes on their cPanel hosting. The bigger challenge was their mixed content — the CMS hardcoded HTTP URLs in image paths and internal links throughout about 400 pages. We wrote a MySQL query to find-and-replace HTTP URLs in the database. Tested it on a staging copy first, obviously. Found and replaced 3,847 hardcoded HTTP references.

Step two: 301 redirects. We added a blanket HTTP-to-HTTPS redirect in .htaccess. Simple, but we had to be careful — the old CMS had some weird URL patterns with query strings, and a naive redirect was breaking their product configurator tool. Ended up writing specific redirect rules for the configurator URLs to preserve query parameters.

Step three: Search Console. Submitted the HTTPS version as a new property. Updated the sitemap URL. Requested indexing on the homepage and top 20 landing pages. Also updated their canonical tags — the CMS was generating canonicals with HTTP URLs, which would've been a mess.

Recovery was faster than expected. Within 12 days, 85% of their indexed pages had switched to the HTTPS version. Rankings dipped about 2-3 positions on average for the first week, then recovered fully by day 18. Two keywords actually improved — "precision CNC machining services" went from position 6 to position 4. No idea why. I'll take it.

Total project time: about 16 hours of work spread over three weeks. If your client is still on HTTP, it's probably easier than you think. Just don't skip the mixed content audit.`,
  },
  {
    id: "human-13",
    expectedVerdict: "human",
    notes: "Comparison post with strong editorial voice, specific tool verdicts",
    content: `I've used Ahrefs and SEMrush almost daily for the past four years. Both are excellent. But they're not interchangeable, and the "which one should I get?" question has a real answer depending on what you actually do.

If your primary job is link building and backlink analysis: Ahrefs. It's not close. Their backlink index is larger, updates faster, and the referring domains data is more accurate. We've cross-checked both tools against actual Google Search Console data for a dozen clients, and Ahrefs matched GSC link data within about 12% on average. SEMrush was off by closer to 25%.

If your primary job is keyword research and competitor analysis: SEMrush. Their keyword database is bigger — 25.5 billion keywords last I checked — and the Keyword Magic Tool is genuinely better for finding long-tail variations. I also prefer their competitive analysis dashboards. The traffic estimation for competitor domains is more granular.

Content optimization? SEMrush wins here too. The SEO Writing Assistant integrates into Google Docs, and their Content Analyzer actually checks readability, tone, and keyword usage in a way that's useful. Ahrefs' Content Explorer is great for finding content ideas, but it's not really an optimization tool.

Technical SEO? Honestly, neither is great compared to Screaming Frog or Sitebulb. But if I had to pick, Ahrefs' Site Audit is cleaner and easier to explain to non-technical stakeholders. SEMrush's Site Audit gives you more data but presents it in a way that overwhelms people.

Pricing is basically identical at $129/month for the standard plans. We carry both and bill them to different client types. If you can only pick one and you're a general SEO practitioner, I'd say SEMrush by a slight margin. But I know plenty of smart SEOs who'd disagree, and they're not wrong.`,
  },
  {
    id: "human-14",
    expectedVerdict: "human",
    notes: "Internal linking strategy, casual teaching tone, concrete examples",
    content: `Internal linking is the most underrated SEO lever. I say this constantly and I will die on this hill. Most sites are sitting on a goldmine of link equity that's just pooling on the homepage and not flowing anywhere useful.

We did an internal linking overhaul for a B2B software client in February. Their blog had 280 posts. Average internal links per post: 1.3. That's pathetic. Most of those links pointed to the homepage or the pricing page — not to other relevant blog content that could rank.

Our approach was simple but tedious. We exported all 280 posts into a spreadsheet. Tagged each one with its primary keyword and topic cluster. Then we built a linking matrix: for each post, we identified 3-5 other posts it should link to based on topical relevance. We weren't linking randomly — every link had to make sense in context.

Then came the grunt work. We went through every post and added contextual internal links. Not "click here" or "read more" anchor text — actual descriptive phrases. If a post about email marketing mentioned "improving open rates," we linked that phrase to our post specifically about email open rate benchmarks. Took our team about 35 hours total.

Results after 60 days: average pages per session went from 1.8 to 2.7. Organic traffic to blog posts in positions 6-20 increased 19% — those mid-ranking posts benefited most from the additional internal link equity. Three posts that had been stuck on page two jumped to page one, including one for a keyword with 2,400 monthly searches.

The tool we used for the audit was Screaming Frog's internal linking report plus a custom Google Sheet. Fancy tools exist for this — InLinks, LinkWhisper — but honestly, a spreadsheet and some patience gets you 90% of the way there. The hard part isn't finding linking opportunities. It's making yourself sit down and actually add them.`,
  },
  {
    id: "human-15",
    expectedVerdict: "human",
    notes: "Pagespeed optimization, technical details mixed with frustration, specific metrics",
    content: `We spent three weeks trying to get a WordPress site under a 2.5-second LCP and I'm going to tell you exactly what worked and what was a complete waste of time. This was for a content publisher running about 1,400 articles on a managed WordPress host (WP Engine, Growth plan).

What didn't work: installing an "all-in-one optimization" plugin. We tried WP Rocket first. It helped with TTFB (dropped from 1.8s to 0.9s) but barely touched LCP because the bottleneck was a hero image that loaded at 847KB. The plugin's lazy loading actually made it worse — it lazy-loaded the hero image, which is the LCP element, which delayed it further. Classic mistake. We turned off lazy loading for above-the-fold images and that alone saved 600ms.

What else didn't work: switching to a "lightweight" theme. We moved from Divi to GeneratePress thinking the DOM reduction would help. DOM nodes went from 3,200 to 1,800. Cool. LCP didn't change at all. The bottleneck was never the DOM — it was the images and render-blocking CSS.

What actually worked: serving images through Cloudflare's image CDN with automatic WebP conversion and responsive sizing. Hero images went from 847KB to 89KB. That alone dropped LCP from 3.1s to 1.9s. Second, we inlined the critical CSS (about 14KB) and deferred everything else. Used the criticalcss.com API to generate it. That knocked off another 400ms. Third, we preconnected to our font provider (Google Fonts) and added a font-display: swap declaration. Saved about 200ms on the LCP text render.

Final numbers: LCP went from 3.1s to 1.4s. CLS was already fine at 0.02. INP improved from 280ms to 95ms mostly from removing jQuery (which three plugins depended on — replacing them was the most annoying part of the whole project).

Total improvement: PageSpeed Insights score went from 38 to 91 on mobile. The client was thrilled. I was just glad it was over. WordPress performance optimization is an exercise in whack-a-mole.`,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI-GENERATED SAMPLES (15)
// Classic AI patterns: uniform paragraph length, transition
// phrases, no contractions, generic openers, hedging language,
// passive voice, no specifics.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AI_SAMPLES: CorpusSample[] = [
  {
    id: "ai-01",
    expectedVerdict: "ai",
    notes: "Generic opener, transition phrases, uniform paragraphs, no first person, no contractions",
    content: `Technical SEO is a critical component of any comprehensive digital marketing strategy. It encompasses the optimization of website infrastructure to ensure that search engines can effectively crawl, index, and render web pages. Without a solid technical foundation, even the most compelling content may fail to achieve its potential in search engine results pages.

Furthermore, technical SEO involves the implementation of structured data markup, which provides search engines with additional context about the content on a page. This structured data can lead to enhanced search results, including rich snippets and knowledge panels. It is worth noting that the proper implementation of schema markup has been shown to improve click-through rates significantly.

Moreover, site speed optimization plays a vital role in technical SEO performance. Search engines have increasingly prioritized page loading speed as a ranking factor, and websites that fail to meet performance benchmarks may experience diminished visibility in search results. The optimization of images, the minification of code, and the implementation of caching strategies are all essential components of a comprehensive speed optimization approach.

In addition to these factors, mobile-friendliness has become an indispensable element of technical SEO. With the shift to mobile-first indexing, search engines now primarily use the mobile version of a website for ranking and indexing purposes. Websites that do not provide an optimal mobile experience may find themselves at a significant disadvantage in search rankings.

In conclusion, technical SEO requires a multifaceted approach that addresses crawlability, structured data, page speed, and mobile optimization. By ensuring that these foundational elements are properly configured, website owners can create an environment that is conducive to achieving strong search engine visibility and sustainable organic traffic growth.`,
  },
  {
    id: "ai-02",
    expectedVerdict: "ai",
    notes: "Definition opener, hedging language, passive voice throughout, no specifics",
    content: `Keyword research refers to the process of identifying and analyzing search terms that users enter into search engines. It is considered one of the most fundamental aspects of search engine optimization, as it provides valuable insights into the topics and queries that are most relevant to a target audience. Effective keyword research can help inform content strategy and guide the creation of optimized web pages.

The process of keyword research typically begins with brainstorming potential topics and seed keywords. These initial ideas may then be expanded through the use of specialized tools and platforms that provide data on search volume, competition levels, and related terms. It is important to consider both short-tail and long-tail keywords, as each type may serve a different purpose within an overall search strategy.

Search intent is another crucial factor that should be taken into consideration during the keyword research process. Keywords can generally be categorized into informational, navigational, commercial, and transactional intent categories. Understanding the intent behind a search query is essential for creating content that effectively addresses the needs of the searcher. In some cases, a single keyword may have multiple potential intents, which could complicate the content planning process.

The competitive landscape should also be evaluated when conducting keyword research. High-volume keywords may be attractive, but they could also be extremely competitive, making it difficult for newer or smaller websites to achieve prominent rankings. In such cases, it might be more strategic to target lower-volume, less competitive keywords that still align with business objectives.

Keyword research is not a one-time activity but rather an ongoing process that should be revisited regularly. Search trends and user behavior may change over time, and new opportunities could emerge as the digital landscape evolves. By maintaining a consistent keyword research practice, organizations can ensure that their content strategy remains aligned with current search demand and competitive dynamics.`,
  },
  {
    id: "ai-03",
    expectedVerdict: "ai",
    notes: "Heavy transition words, zero contractions, uniform structure, no personal voice",
    content: `Link building is an essential practice in search engine optimization that involves acquiring hyperlinks from external websites. These inbound links, commonly referred to as backlinks, serve as signals of trust and authority to search engines. The quality and quantity of backlinks pointing to a website can significantly influence its ability to rank for competitive search terms.

It is important to understand that not all backlinks are created equal. Links from authoritative, relevant websites carry substantially more weight than those from low-quality or unrelated sources. Search engines have developed sophisticated algorithms that evaluate the quality of backlinks based on numerous factors, including the linking domain's authority, the relevance of the linking page, and the context in which the link appears.

Notably, the anchor text used in backlinks can also play a role in how search engines interpret the relevance of a linked page. Descriptive, keyword-rich anchor text may help search engines understand the topic of the destination page. However, it should be noted that overly optimized anchor text could potentially trigger algorithmic penalties, as it may be interpreted as an attempt to manipulate search rankings.

Several strategies exist for acquiring high-quality backlinks. Content creation and promotion, guest posting, digital PR, and broken link building are among the most widely recognized approaches. Each strategy has its own advantages and limitations, and the most effective link building campaigns typically employ a combination of multiple tactics. It is advisable to focus on building relationships with relevant websites and creating content that naturally attracts links.

Significantly, the link building landscape has evolved considerably over the past decade. Search engines have become increasingly adept at identifying and devaluing artificial or manipulative link schemes. As a result, sustainable link building practices now emphasize quality over quantity, relevance over volume, and genuine value creation over transactional exchanges. Organizations that adopt these principles are more likely to achieve lasting improvements in their search engine visibility.`,
  },
  {
    id: "ai-04",
    expectedVerdict: "ai",
    notes: "List-heavy content, all bullet points, generic advice, no contractions",
    content: `On-page SEO optimization encompasses a wide range of techniques that can be applied directly to individual web pages to improve their search engine rankings. Implementing these best practices is essential for ensuring that content is properly understood and valued by search engine algorithms.

The following are key elements of on-page SEO that should be addressed:

- Title tags should be unique for each page and include the primary target keyword. The optimal length for title tags is generally between 50 and 60 characters to ensure proper display in search engine results pages.
- Meta descriptions should provide a compelling summary of the page content and include relevant keywords. While meta descriptions do not directly influence rankings, they can impact click-through rates from search results.
- Header tags (H1, H2, H3) should be used to create a logical content hierarchy. The H1 tag should contain the primary keyword and accurately describe the main topic of the page.
- Image optimization involves adding descriptive alt text, compressing file sizes, and using appropriate file formats. Properly optimized images can improve page load speed and provide additional context for search engines.
- Internal linking helps distribute page authority throughout the website and assists search engines in discovering and indexing content. Links should use descriptive anchor text that provides context about the destination page.
- URL structure should be clean, descriptive, and include relevant keywords where appropriate. Short, readable URLs are generally preferred by both users and search engines.

Additionally, content quality remains the most important factor in on-page optimization. Search engines have become increasingly sophisticated in their ability to evaluate the relevance, depth, and usefulness of content. Pages that provide comprehensive, well-researched information on a topic are more likely to achieve strong rankings.

It is also worth noting that user experience signals, such as page load speed, mobile responsiveness, and overall layout, can influence how search engines evaluate and rank web pages. Ensuring that pages provide a positive user experience should be considered an integral component of any on-page optimization strategy.`,
  },
  {
    id: "ai-05",
    expectedVerdict: "ai",
    notes: "Perfect grammar, no contractions, hedging everywhere, passive voice dominant",
    content: `Content marketing has emerged as one of the most effective strategies for improving organic search visibility and driving sustainable website traffic. By creating and distributing valuable, relevant content, organizations can attract and engage their target audiences while simultaneously building authority and trust with search engines.

The development of a successful content marketing strategy typically requires careful planning and alignment with broader business objectives. It is essential to identify the topics and themes that resonate with the target audience, as well as the formats and channels that are most likely to reach them effectively. Research and analysis should be conducted to understand the competitive landscape and identify opportunities for differentiation.

Content quality is perhaps the most critical factor in determining the success of a content marketing initiative. Search engines have become increasingly sophisticated in their ability to evaluate the depth, accuracy, and usefulness of content. Pages that provide comprehensive, authoritative information on a topic are more likely to be rewarded with prominent search rankings. It is advisable to prioritize quality over quantity, as a smaller number of well-crafted pieces may yield better results than a large volume of mediocre content.

The distribution and promotion of content are equally important considerations. Even the highest-quality content may fail to achieve its potential if it is not effectively promoted to the appropriate audiences. Social media, email marketing, and outreach to relevant industry publications can all play a role in amplifying the reach of content marketing efforts. In some cases, paid promotion may also be warranted to accelerate initial visibility.

Measurement and analysis should be integral components of any content marketing program. Key performance indicators such as organic traffic, engagement metrics, conversion rates, and search rankings should be monitored regularly to assess the effectiveness of content initiatives. This data can then be used to inform future content strategy decisions and optimize ongoing efforts for improved performance.`,
  },
  {
    id: "ai-06",
    expectedVerdict: "ai",
    notes: "Transition-heavy, definition opener, no specifics, perfectly uniform paragraphs",
    content: `Local SEO is a specialized branch of search engine optimization that focuses on improving the visibility of businesses in location-based search results. It is particularly important for businesses that serve customers within a specific geographic area, as it helps ensure that their products and services are discoverable by nearby searchers.

Furthermore, Google Business Profile optimization is considered a cornerstone of any effective local SEO strategy. This free tool provided by Google allows businesses to manage their online presence across Google Search and Google Maps. Properly optimizing a Google Business Profile can significantly enhance a business's visibility in local search results and map pack listings. It is recommended that businesses ensure their profile information is complete, accurate, and regularly updated.

Moreover, local citations play an important role in establishing the credibility and relevance of a local business. Citations are mentions of a business's name, address, and phone number on external websites, directories, and platforms. Consistency in citation information across the web is essential, as discrepancies may confuse search engines and potentially diminish local search performance. It is advisable to conduct regular audits to identify and correct any inconsistencies.

In addition, online reviews have become an increasingly influential factor in local search rankings. Search engines may consider both the quantity and quality of reviews when determining local search prominence. Businesses should develop strategies for encouraging satisfied customers to share their experiences, while also implementing processes for professionally addressing negative feedback.

Importantly, local content creation can further strengthen a business's relevance for geographic search queries. Creating content that addresses local topics, events, and concerns can help demonstrate a business's connection to its community. This type of content may also attract links from local publications and organizations, further enhancing the business's local search authority and visibility.`,
  },
  {
    id: "ai-07",
    expectedVerdict: "ai",
    notes: "Classic AI structure: intro-body-conclusion, no personal voice, hedging throughout",
    content: `Search engine algorithms are complex systems that determine the ranking and visibility of web pages in search results. Understanding how these algorithms function is essential for developing effective search engine optimization strategies that can improve a website's organic search performance.

Search engines utilize hundreds of ranking factors to evaluate and rank web pages. While the exact algorithms are proprietary and closely guarded, significant research has been conducted to identify the factors that appear to have the greatest influence on search rankings. These factors generally fall into several broad categories, including content relevance, technical performance, user experience, and external authority signals.

Content relevance is assessed through natural language processing and semantic analysis techniques that enable search engines to understand the meaning and context of web content. This means that simply including keywords on a page may no longer be sufficient for achieving strong rankings. Search engines can now evaluate the comprehensiveness of content, its alignment with search intent, and its ability to provide value to users. Creating content that thoroughly addresses a topic from multiple angles is therefore advisable.

Technical factors such as page speed, mobile-friendliness, and site architecture also play important roles in search engine rankings. Websites that provide fast, accessible, and well-structured experiences are more likely to be favored by search algorithms. It is worth noting that technical issues such as crawl errors, duplicate content, and broken links could potentially have a negative impact on a site's overall search performance.

External authority signals, primarily in the form of backlinks from other websites, continue to be a significant ranking factor. The quality, relevance, and diversity of a website's backlink profile may influence its perceived authority and trustworthiness. Building a strong backlink profile through legitimate, value-driven strategies remains an important component of comprehensive search engine optimization.`,
  },
  {
    id: "ai-08",
    expectedVerdict: "ai",
    notes: "Passive voice dominant, no contractions, generic advice, hedging",
    content: `Website migration is a process that should be approached with careful planning and meticulous execution. Whether a migration involves changing domains, restructuring URLs, updating the content management system, or transitioning to HTTPS, the potential for disruption to search engine rankings and organic traffic must be carefully managed.

A comprehensive migration plan should be developed well in advance of the actual implementation. This plan should include a complete audit of the existing website, identification of all URLs that will be affected, and the creation of a detailed redirect mapping document. It is recommended that all redirects be implemented as 301 (permanent) redirects to ensure that link equity is properly transferred to the new URLs.

The technical implementation of a website migration should be thoroughly tested in a staging environment before being deployed to production. All redirects should be verified to ensure they are functioning correctly, and any potential issues with canonical tags, meta robots directives, or sitemap configurations should be identified and addressed. It is also advisable to ensure that the robots.txt file on the new site does not inadvertently block search engine crawlers from accessing important content.

Communication with search engines is an important step that should not be overlooked during the migration process. The Google Search Console change of address tool should be utilized when changing domains, and updated sitemaps should be submitted promptly. It may also be beneficial to request indexing of key pages through the URL Inspection tool to accelerate the discovery of new URLs.

Post-migration monitoring is essential for identifying and addressing any issues that may arise. Traffic, rankings, and crawl statistics should be closely monitored in the weeks following a migration. It is not uncommon for some temporary fluctuations to occur, but any significant or prolonged declines should be investigated promptly. A well-executed migration should result in minimal long-term impact on organic search performance.`,
  },
  {
    id: "ai-09",
    expectedVerdict: "ai",
    notes: "Every paragraph same length, no contractions, transition words, definition opener",
    content: `Schema markup is a form of structured data that can be added to website HTML to provide search engines with additional context about the content on a page. By implementing schema markup, website owners can help search engines better understand the meaning and relationships within their content, which may lead to enhanced search result displays known as rich snippets.

There are numerous types of schema markup available, each designed to describe a specific type of content or entity. Common schema types include Article, Product, LocalBusiness, FAQ, HowTo, and Review. The selection of appropriate schema types should be based on the actual content present on the page. It is important to note that implementing schema markup for content that does not exist on the page could be considered a violation of search engine guidelines.

The implementation of schema markup can be accomplished through several methods. JSON-LD (JavaScript Object Notation for Linked Data) is the format recommended by Google and is generally considered the easiest to implement and maintain. JSON-LD code is placed within a script tag in the page header and does not require modification of the existing HTML structure. Alternative formats include Microdata and RDFa, though these are less commonly used in modern implementations.

Validation of schema markup is an essential step that should be performed after implementation. Google provides a Rich Results Test tool that can be used to verify that schema markup is correctly implemented and eligible for rich result display. Additionally, the Schema Markup Validator can be used to check the syntax and completeness of structured data. Regular validation is recommended, as changes to the website or content management system could inadvertently affect schema implementation.

The impact of schema markup on search performance can vary depending on numerous factors, including the type of markup implemented, the competitiveness of the search landscape, and the overall quality of the website. While schema markup does not directly influence search rankings, the enhanced search result displays that it enables could potentially improve click-through rates and drive additional organic traffic to the website.`,
  },
  {
    id: "ai-10",
    expectedVerdict: "ai",
    notes: "No specifics, perfect grammar, hedging, passive voice, no first person",
    content: `E-E-A-T, which stands for Experience, Expertise, Authoritativeness, and Trustworthiness, is a framework used by Google to evaluate the quality of web content. This concept is derived from Google's Search Quality Rater Guidelines and plays an important role in determining how content is perceived and valued by the search engine.

Experience, the newest addition to the framework, refers to the first-hand or personal experience that a content creator has with the subject matter. Content that demonstrates genuine experience with a topic may be considered more valuable and trustworthy than content that is purely theoretical or research-based. This factor has become increasingly important as search engines seek to differentiate between content created by practitioners and content generated by those without direct experience.

Expertise relates to the knowledge and skill that a content creator possesses in their field. For topics that require specialized knowledge, such as medical, financial, or legal subjects, the expertise of the content creator is given particularly significant weight. It is recommended that websites clearly identify their content creators and provide information about their qualifications and credentials to help establish expertise.

Authoritativeness is a measure of the reputation and recognition that a website or content creator has within their industry or field. This factor may be influenced by external signals such as backlinks from authoritative sources, mentions in industry publications, and recognition from professional organizations. Building authority is generally a long-term endeavor that requires consistent production of high-quality content and active participation in the relevant professional community.

Trustworthiness encompasses the overall reliability, transparency, and integrity of a website and its content. Factors that may influence trustworthiness include website security, transparent ownership information, clear editorial policies, accurate citations, and responsive customer service. Ensuring that a website demonstrates strong trustworthiness signals is essential for building user confidence and meeting search engine quality standards.`,
  },
  {
    id: "ai-11",
    expectedVerdict: "ai",
    notes: "List-heavy, no contractions, transition phrases, generic advice, no personal examples",
    content: `Site speed optimization is a fundamental aspect of both search engine optimization and user experience. Search engines have consistently emphasized the importance of page loading speed as a ranking factor, and websites that deliver fast, responsive experiences are more likely to achieve favorable search rankings and retain their visitors.

There are several key metrics that should be monitored when evaluating site speed performance:

- Largest Contentful Paint (LCP) measures the time it takes for the largest visible content element to render on the screen. An optimal LCP score is considered to be under 2.5 seconds.
- First Input Delay (FID) measures the time from when a user first interacts with the page to when the browser responds to that interaction. A good FID score is under 100 milliseconds.
- Cumulative Layout Shift (CLS) measures the visual stability of a page by quantifying unexpected layout shifts. A good CLS score is under 0.1.
- Interaction to Next Paint (INP) is a newer metric that measures overall responsiveness to user interactions throughout the entire page lifecycle. A good INP score is under 200 milliseconds.

Furthermore, several optimization strategies can be employed to improve site speed performance:

- Image optimization, including compression, format conversion, and responsive sizing, is often the most impactful improvement that can be made.
- Code minification and compression can reduce the size of HTML, CSS, and JavaScript files, resulting in faster download times.
- Browser caching allows frequently accessed resources to be stored locally, reducing the need for repeated downloads.
- Content Delivery Networks (CDNs) distribute content across geographically distributed servers, reducing latency for users in different locations.

It is important to note that site speed optimization is an ongoing process rather than a one-time task. Regular monitoring and testing should be conducted to identify new performance issues and ensure that optimization efforts continue to deliver the desired results. Tools such as Google PageSpeed Insights and Lighthouse can provide valuable insights into current performance and specific optimization opportunities.`,
  },
  {
    id: "ai-12",
    expectedVerdict: "ai",
    notes: "Zero contractions, uniform structure, no specifics, hedging, passive voice",
    content: `Mobile SEO has become an indispensable component of any comprehensive search engine optimization strategy. With the majority of web searches now originating from mobile devices, ensuring that websites provide an optimal experience for mobile users is essential for maintaining and improving search engine visibility.

Google's implementation of mobile-first indexing means that the mobile version of a website is now the primary version used for ranking and indexing purposes. This shift has made it imperative for website owners to ensure that their mobile experience is at least as comprehensive and well-optimized as their desktop experience. Content, structured data, and metadata should be consistent across both versions of the site.

Responsive web design is generally considered the preferred approach for creating mobile-friendly websites. This design methodology allows a single website to adapt its layout and presentation based on the screen size and capabilities of the device being used. Responsive design eliminates the need for maintaining separate mobile and desktop versions of a website, which can reduce complexity and ensure consistency.

Page speed is particularly critical for mobile users, who may be accessing websites on slower network connections. Mobile page speed optimization should focus on reducing file sizes, minimizing server response times, and eliminating render-blocking resources. It is recommended that mobile pages load their primary content within three seconds to avoid excessive bounce rates and potential ranking impacts.

Touch-friendly navigation and interface design are also important considerations for mobile SEO. Buttons and links should be appropriately sized and spaced to accommodate touch interactions, and forms should be designed to minimize the amount of typing required. Pop-ups and interstitials that obstruct content on mobile devices should be avoided, as search engines may penalize websites that employ intrusive mobile interstitials.`,
  },
  {
    id: "ai-13",
    expectedVerdict: "ai",
    notes: "Transition-heavy, no first person, perfect grammar, no contractions, hedging",
    content: `Content pruning is a strategic SEO practice that involves the systematic evaluation and removal or improvement of underperforming content on a website. This process is based on the principle that the overall quality of a website's content portfolio can influence how search engines perceive and rank individual pages within that portfolio.

It is important to understand that not all content on a website contributes positively to its search engine performance. Pages that receive little or no organic traffic, generate few or no backlinks, and fail to achieve meaningful search rankings may actually be diluting the overall quality signals of the website. By identifying and addressing these underperforming pages, website owners may be able to improve the search performance of their remaining content.

The content pruning process typically begins with a comprehensive content audit. All pages on the website should be evaluated based on key performance metrics, including organic traffic, search rankings, backlink profile, engagement metrics, and conversion rates. Pages that consistently underperform across multiple metrics are candidates for further evaluation. It should be noted that some pages may serve important purposes beyond search performance, such as supporting the customer journey or providing essential information.

Several options are available for addressing underperforming content. Pages with outdated or thin content may benefit from being updated and expanded with current, comprehensive information. Pages that cover topics already addressed by other, more successful pages on the site could be consolidated through redirects. Pages that provide no value and are unlikely to be improved may be candidates for removal.

Importantly, content pruning should be approached with caution and careful analysis. Removing or redirecting pages without proper evaluation could inadvertently affect search performance for valuable keywords or disrupt existing link equity. It is advisable to implement changes incrementally and monitor the impact on search performance before proceeding with additional modifications. Regular content audits should be conducted to ensure that the website's content portfolio remains aligned with current search engine standards and user expectations.`,
  },
  {
    id: "ai-14",
    expectedVerdict: "ai",
    notes: "Classic AI essay structure, no contractions, hedging, passive voice, no personal experience",
    content: `International SEO is the practice of optimizing a website to ensure that search engines can identify the countries and languages that a business wishes to target. For organizations that operate across multiple markets, implementing an effective international SEO strategy is essential for maximizing organic search visibility in each target region.

The selection of an appropriate URL structure is one of the most fundamental decisions in international SEO. Three primary options are available: country-code top-level domains (ccTLDs), subdirectories, and subdomains. Each approach has its own advantages and considerations. Country-code top-level domains provide the strongest geographic signal but require separate domain management. Subdirectories are easier to manage and consolidate domain authority but provide a weaker geographic signal. Subdomains offer a middle ground but may be treated as separate entities by search engines.

Hreflang implementation is another critical component of international SEO. Hreflang tags inform search engines about the language and geographic targeting of a page and its equivalent versions in other languages or regions. Proper implementation of hreflang tags can help prevent duplicate content issues and ensure that the appropriate version of a page is served to users in different locations. It should be noted that hreflang implementation can be technically complex, and errors are common.

Content localization extends beyond simple translation. Effective localization involves adapting content to reflect local cultural norms, preferences, and search behaviors. Keywords and phrases that perform well in one market may have different search volumes or meanings in another. It is therefore advisable to conduct market-specific keyword research for each target region rather than simply translating existing keyword lists.

Technical considerations for international SEO include server location, content delivery network configuration, and language detection mechanisms. While server location has become less important with the widespread use of CDNs, ensuring that content is delivered efficiently to users in target markets remains an important factor. Automatic language detection and redirection should be implemented carefully to avoid disrupting search engine crawling or frustrating users who prefer to select their language manually.`,
  },
  {
    id: "ai-15",
    expectedVerdict: "ai",
    notes: "No contractions, definition opener, uniform paragraphs, passive voice, hedging, zero specifics",
    content: `SEO reporting is the process of collecting, analyzing, and presenting data related to a website's search engine optimization performance. Effective reporting is essential for demonstrating the value of SEO initiatives, identifying areas for improvement, and making informed decisions about future optimization strategies.

A comprehensive SEO report should include several key categories of data. Organic traffic metrics, including total sessions, users, and pageviews, provide an overview of the volume of visitors arriving through organic search. These metrics should be tracked over time to identify trends and measure the impact of optimization efforts. It is advisable to segment organic traffic data by landing page, device type, and geographic location to gain a more granular understanding of performance.

Search ranking data is another essential component of SEO reporting. Tracking the positions of target keywords in search results provides insight into the visibility of the website for important search queries. It is important to monitor rankings across multiple search engines and devices, as performance may vary significantly between desktop and mobile results. Changes in rankings should be analyzed in the context of algorithm updates, competitive activity, and on-site changes.

Backlink metrics should also be included in regular SEO reports. The total number of referring domains, the quality and relevance of linking websites, and the growth or decline of the backlink profile over time are all valuable data points. Monitoring the backlink profile can help identify potential issues, such as the loss of valuable links or the acquisition of low-quality or spammy links that could negatively impact search performance.

Conversion and revenue data are perhaps the most important metrics for demonstrating the business value of SEO. By tracking the conversions and revenue attributed to organic search traffic, SEO professionals can clearly communicate the return on investment of their optimization efforts. It is recommended that conversion tracking be properly configured and that attribution models be carefully selected to ensure accurate measurement of SEO's contribution to overall business performance.`,
  },
];
