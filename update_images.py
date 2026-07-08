import re

with open('src/pages/programs.astro', 'r') as f:
    content = f.read()

replacements = {
    'prenatal_yoga': 'Prenatal Yoga Safe Practices.png',
    'power_yoga': 'Power Yoga Core Sculpt.png',
    'yoga_anatomy': 'Yoga Anatomy Masterclass.png',
    'restorative_sleep': 'Restorative Yoga for Deep Sleep.png',
    'inversion_workshop': 'Ultimate Inversion Workshop.png',
    'challenge_21day': '21-Day Yoga Challenge.png',
    'beginners_ebook': 'Yoga for Beginners eBook.png',
    'chair_yoga_seniors': 'Chair Yoga for Seniors.png',
    'yoga_diabetes': 'Yoga for Diabetes Guide.png'
}

for program_id, image_name in replacements.items():
    pattern = re.compile(r'(id:\s*\"' + program_id + r'\"[\s\S]*?coverSvg:\s*\"[^\"]*\")')
    def replacer(match):
        return match.group(1) + ',\n    coverImage: "images/programs/' + image_name + '"'
    content = pattern.sub(replacer, content)

with open('src/pages/programs.astro', 'w') as f:
    f.write(content)
