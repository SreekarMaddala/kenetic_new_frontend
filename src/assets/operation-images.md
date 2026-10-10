# What we do: feature images

Four distinct images generated with the built-in imagegen tool for the Kenetic
landing page. Each operation uses its own local asset in `src/routes/index.tsx`.
JPEGs are encoded at quality 92 without resizing. Native output dimensions are
1672 × 941, except People & Payroll at 1672 × 940. These are generated images,
not photographs documenting actual Kenetic customers or projects.

| Section | Saved asset |
| --- | --- |
| Project control | `operation-project-control.jpg` |
| People & payroll | `operation-people-payroll.jpg` |
| Materials & movement | `operation-materials-movement.jpg` |
| Finance & approvals | `operation-finance-approvals.jpg` |

## Shared prompt

Use case: photorealistic-natural. Asset type: Kenetic construction management
landing-page feature photo, one standalone image. Style: premium editorial
architectural photography, photorealistic natural textures, crisp detail,
restrained cool neutral and subtle teal color grading, soft daylight, professional
and believable. Composition: landscape 16:9, subject framed centrally to survive a
narrower feature-panel crop, keep bottom quarter quiet for a caption overlay added
in HTML. Request maximum available resolution ideally 3840x2160. No text, no
letters, no logos, no watermarks, no UI mockup, no collage.

The requested resolution was aspirational; the files use the tool's native output
dimensions above and are not upscaled or labeled as 4K.

## Section prompts

**Project control:** Primary request: project control and planning. Scene: two
construction engineers wearing white hard hats and safety vests reviewing large
rolled-out architectural drawings on a clean site table, an unfinished modern
concrete building visible behind them. Primary focal point is plans and hands
pointing at the drawing, with engineers recognizable as human collaborators.
Mid-wide photograph, accurate hands, safe site setting.

**People & payroll:** Primary request: people and payroll. Scene: small group of
construction workers wearing proper safety vests and helmets gathered beside a
site supervisor who checks the daily attendance roster on a tablet. Friendly
professional workplace scene at the start of a working day, unfinished building
softly visible behind, medium-wide group portrait, natural varied faces, accurate
hands, no legible tablet content.

**Materials & movement:** Primary request: materials and movement. Scene:
organized construction materials yard with carefully bundled reinforcing steel
bars and stacked packaged cement materials, a forklift transporting a pallet in
the midground, safe clear vehicle lane, helmets and safety vest on operator,
architectural construction setting. Emphasize materials and logistics, not worker
portrait. Premium documentary photograph, rich material texture, no visible words
on bags.

**Finance & approvals:** Primary request: finance and approvals for a construction
business. Scene: close editorial view of a construction finance manager's hands
reviewing printed invoice paperwork beside a laptop and calculator on a modern
site-office desk; another colleague points to a paper record. A hard hat and
rolled architectural drawing at the back hint at construction. Center focus on
financial paperwork and approval workflow; document marks indistinct, laptop
screen neutral without legible text. Natural professional photographic lighting,
accurate hands.
