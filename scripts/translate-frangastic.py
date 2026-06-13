#!/usr/bin/env python3
"""
Нормализация и перевод frangastic.csv:
- Perfume/Brand: slug -> Title Case (латиница)
- Top/Middle/Base notes: перевод нот на русский по словарю NOTES_RU
- mainaccord1..5: перевод аккордов на русский по словарю ACCORDS_RU
Неизвестные ноты/аккорды остаются как есть (на английском) — добавляйте их в словари по мере встречаемости.
"""
import csv
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from notes_extra import NOTES_EXTRA_RU

ACCORDS_RU = {
    "alcohol": "алкогольный",
    "aldehydic": "альдегидный",
    "almond": "миндальный",
    "amber": "амбровый",
    "animalic": "анималистический",
    "anis": "анисовый",
    "aquatic": "водный",
    "aromatic": "ароматный",
    "asphault": "асфальтовый",
    "balsamic": "бальзамический",
    "beeswax": "пчелиный воск",
    "bitter": "горький",
    "brown scotch tape": "коричневый скотч",
    "cacao": "какао",
    "camphor": "камфорный",
    "cannabis": "каннабис",
    "caramel": "карамельный",
    "champagne": "шампанское",
    "cherry": "вишнёвый",
    "chocolate": "шоколадный",
    "cinnamon": "коричный",
    "citrus": "цитрусовый",
    "clay": "глина",
    "coca-cola": "кока-кола",
    "coconut": "кокосовый",
    "coffee": "кофейный",
    "conifer": "хвойный",
    "creamy": "сливочный",
    "earthy": "землистый",
    "floral": "цветочный",
    "fresh": "свежий",
    "fresh spicy": "свежий пряный",
    "fruity": "фруктовый",
    "gasoline": "бензин",
    "gourmand": "гурманский",
    "green": "зелёный",
    "herbal": "травяной",
    "honey": "медовый",
    "hot iron": "горячий утюг",
    "industrial glue": "промышленный клей",
    "iris": "ирисовый",
    "lactonic": "лактонный",
    "lavender": "лавандовый",
    "leather": "кожаный",
    "marine": "морской",
    "metallic": "металлический",
    "mineral": "минеральный",
    "mossy": "мшистый",
    "musky": "мускусный",
    "nutty": "ореховый",
    "oily": "маслянистый",
    "oriental": "восточный",
    "oud": "уд",
    "ozonic": "озоновый",
    "paper": "бумажный",
    "patchouli": "пачули",
    "plastic": "пластиковый",
    "powdery": "пудровый",
    "rose": "розовый",
    "rubber": "резиновый",
    "rum": "ромовый",
    "salty": "солёный",
    "sand": "песок",
    "savory": "пикантный",
    "smoky": "дымный",
    "soapy": "мыльный",
    "soft spicy": "мягкий пряный",
    "sour": "кислый",
    "spicy": "пряный",
    "sweet": "сладкий",
    "terpenic": "терпеновый",
    "tobacco": "табачный",
    "tropical": "тропический",
    "tuberose": "туберозовый",
    "vanilla": "ванильный",
    "vinyl": "винил",
    "violet": "фиалковый",
    "vodka": "водка",
    "warm spicy": "тёплый пряный",
    "whiskey": "виски",
    "white floral": "белые цветы",
    "wine": "винный",
    "woody": "древесный",
    "yellow floral": "жёлтые цветы",
}

NOTES_RU = {
    "musk": "мускус",
    "bergamot": "бергамот",
    "sandalwood": "сандал",
    "jasmine": "жасмин",
    "amber": "амбра",
    "patchouli": "пачули",
    "vanilla": "ваниль",
    "rose": "роза",
    "cedar": "кедр",
    "mandarin orange": "мандарин",
    "vetiver": "ветивер",
    "tonka bean": "бобы тонка",
    "lemon": "лимон",
    "lavender": "лаванда",
    "orange blossom": "цветок апельсина",
    "lily-of-the-valley": "ландыш",
    "pink pepper": "розовый перец",
    "cardamom": "кардамон",
    "violet": "фиалка",
    "iris": "ирис",
    "grapefruit": "грейпфрут",
    "ylang-ylang": "иланг-иланг",
    "leather": "кожа",
    "geranium": "герань",
    "oakmoss": "дубовый мох",
    "peach": "персик",
    "freesia": "фрезия",
    "white musk": "белый мускус",
    "benzoin": "бензоин",
    "cinnamon": "корица",
    "orange": "апельсин",
    "neroli": "нероли",
    "black currant": "чёрная смородина",
    "peony": "пион",
    "nutmeg": "мускатный орех",
    "agarwood (oud)": "агаровое дерево (уд)",
    "ginger": "имбирь",
    "pear": "груша",
    "tuberose": "тубероза",
    "incense": "ладан",
    "saffron": "шафран",
    "labdanum": "лабданум",
    "raspberry": "малина",
    "woody notes": "древесные ноты",
    "magnolia": "магнолия",
    "heliotrope": "гелиотроп",
    "ambergris": "амбра серая",
    "pepper": "перец",
    "gardenia": "гардения",
    "apple": "яблоко",
    "mint": "мята",
    "coriander": "кориандр",
    "green notes": "зелёные ноты",
    "black pepper": "чёрный перец",
    "virginia cedar": "виргинский кедр",
    "citruses": "цитрусовые",
    "plum": "слива",
    "woodsy notes": "лесные ноты",
    "guaiac wood": "гваяковое дерево",
    "violet leaf": "лист фиалки",
    "pineapple": "ананас",
    "carnation": "гвоздика (цветок)",
    "sage": "шалфей",
    "moss": "мох",
    "lime": "лайм",
    "orchid": "орхидея",
    "vanille": "ваниль",
    "jasmine sambac": "жасмин самбак",
    "lily": "лилия",
    "aldehydes": "альдегиды",
    "basil": "базилик",
    "caramel": "карамель",
    "tobacco": "табак",
    "cashmere wood": "кашемировое дерево",
    "tangerine": "мандарин (танжерин)",
    "rosemary": "розмарин",
    "osmanthus": "османтус",
    "galbanum": "гальбанум",
    "honey": "мёд",
    "orris root": "корень ириса",
    "petitgrain": "петитгрейн",
    "olibanum": "ладан (оливанум)",
    "coconut": "кокос",
    "clary sage": "мускатный шалфей",
    "cloves": "гвоздика (специя)",
    "cypress": "кипарис",
    "cassis": "кассис",
    "amalfi lemon": "лимон амальфи",
    "litchi": "личи",
    "ambroxan": "амброксан",
    "mimosa": "мимоза",
    "cashmeran": "кашмеран",
    "bulgarian rose": "болгарская роза",
    "almond": "миндаль",
    "artemisia": "полынь",
    "lotus": "лотос",
    "apricot": "абрикос",
    "floral notes": "цветочные ноты",
    "cyclamen": "цикламен",
    "praline": "пралине",
    "spices": "специи",
    "sea notes": "морские ноты",
    "bitter orange": "горький апельсин",
    "orris": "ирис (орис)",
    "myrrh": "мирра",
    "coffee": "кофе",
    "red berries": "красные ягоды",
    "ambrette (musk mallow)": "амбретта (мускусная мальва)",
    "melon": "дыня",
    "juniper": "можжевельник",
    "honeysuckle": "жимолость",
    "turkish rose": "турецкая роза",
    "juniper berries": "ягоды можжевельника",
    "water lily": "водяная лилия",
    "suede": "замша",
    "tea": "чай",
    "african orange flower": "африканский цветок апельсина",
    "narcissus": "нарцисс",
    "damask rose": "дамасская роза",
    "green apple": "зелёное яблоко",
    "rum": "ром",
    "white flowers": "белые цветы",
    "fruity notes": "фруктовые ноты",
    "styrax": "стиракс",
    "red apple": "красное яблоко",
    "frangipani": "франжипани",
    "passionfruit": "маракуйя",
    "amberwood": "амбровое дерево",
    "cypriol oil or nagarmotha": "масло циприол (нагармота)",
    "elemi": "элеми",
    "blackberry": "ежевика",
    "madagascar vanilla": "мадагаскарская ваниль",
    "lilac": "сирень",
    "thyme": "тимьян",
    "clove": "гвоздика (специя)",
    "anise": "анис",
    "oak moss": "дубовый мох",
    "fig": "инжир",
    "birch": "берёза",
    "rhubarb": "ревень",
    "cacao": "какао",
    "hyacinth": "гиацинт",
    "water notes": "водные ноты",
    "yuzu": "юзу",
    "star anise": "бадьян",
    "blood orange": "кровавый апельсин",
    "caraway": "тмин",
    "civet": "цибетин",
    "haitian vetiver": "гаитянский ветивер",
    "mango": "манго",
    "strawberry": "клубника",
    "brazilian rosewood": "бразильское розовое дерево",
    "green leaves": "зелёные листья",
    "tiare flower": "цветок тиаре",
    "cherry": "вишня",
    "calabrian bergamot": "калабрийский бергамот",
    "green tea": "зелёный чай",
    "spicy notes": "пряные ноты",
    "opoponax": "опопонакс",
    "palisander rosewood": "палисандровое (розовое) дерево",
    "angelica": "дудник (анжелика)",
    "cumin": "тмин (кумин)",
    "watermelon": "арбуз",
    "watery notes": "водные ноты",
    "licorice": "солодка (лакрица)",
    "sicilian lemon": "сицилийский лимон",
    "pomegranate": "гранат",
    "milk": "молоко",
    "sugar": "сахар",
    "castoreum": "кастореум",
    "tolu balsam": "толуанский бальзам",
    "pink grapefruit": "розовый грейпфрут",
    "egyptian jasmine": "египетский жасмин",
    "bourbon vanilla": "бурбонская ваниль",
    "white woods": "белая древесина",
    "tarragon": "эстрагон",
    "myrhh": "мирра",
    "sandalowood": "сандал",
    "may rose": "майская роза",
    "white amber": "белая амбра",
    "peru balsam": "перуанский бальзам",
    "red currant": "красная смородина",
    "powdery notes": "пудровые ноты",
    "atlas cedar": "атласский кедр",
    "clementine": "клементин",
    "immortelle": "иммортель (бессмертник)",
    "citron": "цитрон",
    "chamomile": "ромашка",
    "mate": "мате",
    "papyrus": "папирус",
    "oak": "дуб",
    "french labdanum": "французский лабданум",
    "coumarin": "кумарин",
    "fig leaf": "лист инжира",
    "hazelnut": "фундук",
    "lemon verbena": "лимонная вербена",
    "bamboo": "бамбук",
    "salt": "соль",
    "nectarine": "нектарин",
    "pomelo": "помело",
    "balsam fir": "пихтовый бальзам",
    "sweet notes": "сладкие ноты",
    "vetyver": "ветивер",
    "cherry blossom": "цветок сакуры",
    "green mandarin": "зелёный мандарин",
    "sea water": "морская вода",
    "red fruits": "красные фрукты",
    "white pepper": "белый перец",
    "ozonic notes": "озоновые ноты",
    "violet leaves": "листья фиалки",
    "black tea": "чёрный чай",
    "hibiscus": "гибискус",
    "cassia": "кассия",
    "vanila": "ваниль",
    "wormwood": "полынь",
    "teak wood": "тиковое дерево",
    "italian lemon": "итальянский лимон",
    "davana": "давана",
    "sichuan pepper": "сычуаньский перец",
    "dark chocolate": "тёмный шоколад",
    "marigold": "бархатцы",
    "driftwood": "морской бриз (дрифтвуд)",
    "peach blossom": "цветок персика",
    "resins": "смолы",
    "hedione": "гедион",
    "sicilian bergamot": "сицилийский бергамот",
    "eucalyptus": "эвкалипт",
    "indonesian patchouli leaf": "индонезийский лист пачули",
    "chocolate": "шоколад",
    "ivy": "плющ",
    "precious woods": "ценные породы дерева",
    "elemi resin": "смола элеми",
    "amyris": "амирис",
    "bay leaf": "лавровый лист",
    "tagetes": "бархатцы (тагетес)",
    "white peach": "белый персик",
    "grass": "трава",
    "whipped cream": "взбитые сливки",
    "guava": "гуава",
    "pine": "сосна",
    "fruits": "фрукты",
    "pimento": "перец пименто",
    "white rose": "белая роза",
    "pine tree": "сосна",
    "hawthorn": "боярышник",
    "blueberry": "черника",
    "granny smith apple": "яблоко гренни смит",
    "beeswax": "пчелиный воск",
    "white cedar extract": "экстракт белого кедра",
    "fir": "пихта",
    "vanilla orchid": "ванильная орхидея",
    "hiacynth": "гиацинт",
    "mahogany": "красное дерево (махагон)",
    "australian sandalwood": "австралийский сандал",
    "herbal notes": "травяные ноты",
    "solar notes": "солнечные ноты",
    "smoke": "дым",
    "dried fruits": "сухофрукты",
    "carrot seeds": "семена моркови",
    "sweet orange": "сладкий апельсин",
    "kumquat": "кумкват",
    "cognac": "коньяк",
    "sea salt": "морская соль",
    "italian mandarin": "итальянский мандарин",
    "apple blossom": "цветок яблони",
    "cacao pod": "стручок какао",
    "bitter almond": "горький миндаль",
    "marshmallow": "зефир (маршмеллоу)",
    "coconut milk": "кокосовое молоко",
    "kiwi": "киви",
    "myrtle": "мирт",
    "rose petals": "лепестки розы",
    "flowers": "цветы",
    "vanilla absolute": "ванильный абсолют",
    "cotton candy": "сахарная вата",
    "cedarwood": "кедровое дерево",
    "passion flower": "цветок пассифлоры",
    "hay": "сено",
    "gurjan balsam": "гурджунский бальзам",
    "indian jasmine": "индийский жасмин",
    "big strawberry": "крупная клубника",
    "tobacco leaf": "лист табака",
    "siam benzoin": "сиамский бензоин",
    "rose de mai": "майская роза",
    "seaweed": "водоросли",
    "wild berries": "лесные ягоды",
    "white honey": "белый мёд",
    "cranberry": "клюква",
    "lily of the valley": "ландыш",
    "virginian cedar": "виргинский кедр",
    "quince": "айва",
    "pink peony": "розовый пион",
    "white wood": "белая древесина",
    "sweet pea": "душистый горошек",
    "sour cherry": "вишня кислая",
    "white tea": "белый чай",
    "iso e super": "изо е супер",
    "almond blossom": "цветок миндаля",
    "whiskey": "виски",
    "champaca": "чампака",
}

NOTES_RU.update(NOTES_EXTRA_RU)

GENDER_RU = {
    "women": "женский",
    "men": "мужской",
    "unisex": "унисекс",
}

# слова, которые не нужно делать с большой буквы в названиях/брендах
LOWER_WORDS = {"de", "du", "des", "la", "le", "les", "et", "and", "of", "for", "by"}


def normalize_name(slug: str) -> str:
    """slug-style строку -> Title Case с пробелами."""
    words = slug.strip().split("-")
    out = []
    for i, w in enumerate(words):
        if not w:
            continue
        lw = w.lower()
        if i > 0 and lw in LOWER_WORDS:
            out.append(lw)
        else:
            out.append(lw[:1].upper() + lw[1:])
    return " ".join(out)


def translate_list(value: str, dictionary: dict) -> str:
    """Переводит запятая-разделённый список через словарь, неизвестное оставляет как есть."""
    parts = [p.strip() for p in value.split(",") if p.strip()]
    translated = [dictionary.get(p.lower(), p) for p in parts]
    return ", ".join(translated)


def translate_accord(value: str) -> str:
    value = value.strip()
    if not value:
        return value
    return ACCORDS_RU.get(value.lower(), value)


def main(in_path: str, out_path: str):
    with open(in_path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader)
        rows = list(reader)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(header)

        unknown_notes = set()
        unknown_accords = set()

        for row in rows:
            if len(row) < 11:
                continue
            d = dict(zip(header, row))

            d["Perfume"] = normalize_name(d["Perfume"])
            d["Brand"] = normalize_name(d["Brand"])
            d["Gender"] = GENDER_RU.get(d["Gender"].strip().lower(), d["Gender"])

            for col in ("Top", "Middle", "Base"):
                for p in d[col].split(","):
                    p = p.strip().lower()
                    if p and p not in NOTES_RU:
                        unknown_notes.add(p)
                d[col] = translate_list(d[col], NOTES_RU)

            for col in ("mainaccord1", "mainaccord2", "mainaccord3", "mainaccord4", "mainaccord5"):
                v = d[col].strip().lower()
                if v and v not in ACCORDS_RU:
                    unknown_accords.add(v)
                d[col] = translate_accord(d[col])

            writer.writerow([d[h] for h in header])

    print(f"OK -> {out_path}")
    if unknown_notes:
        print(f"\nНеизвестные ноты ({len(unknown_notes)}), оставлены на английском:")
        for n in sorted(unknown_notes):
            print(" ", n)
    if unknown_accords:
        print(f"\nНеизвестные аккорды ({len(unknown_accords)}):")
        for a in sorted(unknown_accords):
            print(" ", a)


if __name__ == "__main__":
    in_path = sys.argv[1] if len(sys.argv) > 1 else "frangastic.csv"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "frangastic_ru.csv"
    main(in_path, out_path)
