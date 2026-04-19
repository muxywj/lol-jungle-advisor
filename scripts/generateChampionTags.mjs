const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

const POSITION_OVERRIDES = {
  top: new Set([
    "Aatrox",
    "Ambessa",
    "Camille",
    "Chogath",
    "Darius",
    "DrMundo",
    "Fiora",
    "Gangplank",
    "Garen",
    "Gnar",
    "Gwen",
    "Illaoi",
    "Irelia",
    "Jax",
    "Jayce",
    "KSante",
    "Kayle",
    "Kennen",
    "Kled",
    "Malphite",
    "Mordekaiser",
    "Nasus",
    "Olaf",
    "Ornn",
    "Poppy",
    "Quinn",
    "Renekton",
    "Riven",
    "Rumble",
    "Sett",
    "Shen",
    "Singed",
    "Sion",
    "TahmKench",
    "Teemo",
    "Tryndamere",
    "Urgot",
    "Vladimir",
    "Yorick",
  ]),
  jungle: new Set([
    "Amumu",
    "Belveth",
    "Briar",
    "Diana",
    "Elise",
    "Evelynn",
    "Fiddlesticks",
    "Gragas",
    "Graves",
    "Hecarim",
    "Ivern",
    "JarvanIV",
    "Karthus",
    "Kayn",
    "Khazix",
    "Kindred",
    "LeeSin",
    "Lillia",
    "MasterYi",
    "Naafiri",
    "Nidalee",
    "Nocturne",
    "Nunu",
    "Rammus",
    "RekSai",
    "Rengar",
    "Sejuani",
    "Shaco",
    "Shyvana",
    "Skarner",
    "Taliyah",
    "Trundle",
    "Udyr",
    "Vi",
    "Viego",
    "Volibear",
    "Warwick",
    "XinZhao",
    "Zac",
    "Zaahen",
  ]),
  mid: new Set([
    "Ahri",
    "Akali",
    "Akshan",
    "Anivia",
    "Annie",
    "AurelionSol",
    "Aurora",
    "Azir",
    "Brand",
    "Cassiopeia",
    "Corki",
    "Ekko",
    "Fizz",
    "Galio",
    "Heimerdinger",
    "Hwei",
    "Kassadin",
    "Katarina",
    "Leblanc",
    "Lissandra",
    "Lux",
    "Malzahar",
    "Mel",
    "Naafiri",
    "Neeko",
    "Orianna",
    "Pantheon",
    "Qiyana",
    "Ryze",
    "Swain",
    "Sylas",
    "Syndra",
    "Talon",
    "TwistedFate",
    "Veigar",
    "Velkoz",
    "Vex",
    "Viktor",
    "Xerath",
    "Yasuo",
    "Yone",
    "Zed",
    "Ziggs",
    "Zoe",
  ]),
  adc: new Set([
    "Aphelios",
    "Ashe",
    "Caitlyn",
    "Draven",
    "Ezreal",
    "Jhin",
    "Jinx",
    "Kaisa",
    "Kalista",
    "KogMaw",
    "Lucian",
    "MissFortune",
    "Samira",
    "Sivir",
    "Smolder",
    "Tristana",
    "Twitch",
    "Varus",
    "Vayne",
    "Xayah",
    "Yunara",
    "Zeri",
  ]),
  support: new Set([
    "Alistar",
    "Bard",
    "Blitzcrank",
    "Braum",
    "Janna",
    "Karma",
    "Leona",
    "Lulu",
    "Milio",
    "Morgana",
    "Nami",
    "Nautilus",
    "Pyke",
    "Rakan",
    "Rell",
    "Renata",
    "Senna",
    "Seraphine",
    "Sona",
    "Soraka",
    "Taric",
    "Thresh",
    "Yuumi",
    "Zilean",
    "Zyra",
  ]),
};

const ROAMING_CORES = new Set([
  "Ahri",
  "Akali",
  "Akshan",
  "AurelionSol",
  "Bard",
  "Ekko",
  "Galio",
  "Katarina",
  "Leblanc",
  "Pantheon",
  "Pyke",
  "Qiyana",
  "Rakan",
  "Ryze",
  "Sylas",
  "Taliyah",
  "Talon",
  "TwistedFate",
]);

const SAFE_WHEN_BEHIND = new Set([
  "Alistar",
  "Amumu",
  "Anivia",
  "Braum",
  "Galio",
  "Garen",
  "Gnar",
  "Gragas",
  "Janna",
  "Leona",
  "Lulu",
  "Malphite",
  "Maokai",
  "Milio",
  "Mordekaiser",
  "Nautilus",
  "Nunu",
  "Ornn",
  "Rammus",
  "Rell",
  "Sejuani",
  "Shen",
  "Sion",
  "Skarner",
  "Sona",
  "Soraka",
  "TahmKench",
  "Taric",
  "Thresh",
  "Yuumi",
  "Zac",
  "Zilean",
]);

const HARD_TO_RECOVER = new Set([
  "Akali",
  "Aphelios",
  "Briar",
  "Camille",
  "Darius",
  "Draven",
  "Elise",
  "Fiora",
  "Irelia",
  "Jayce",
  "Kalista",
  "Katarina",
  "Khazix",
  "Leblanc",
  "Lucian",
  "Nidalee",
  "Pantheon",
  "Pyke",
  "Qiyana",
  "Quinn",
  "Renekton",
  "Riven",
  "Samira",
  "Shaco",
  "Talon",
  "Zed",
]);

const IGNITE_SENSITIVE = new Set([
  "Aatrox",
  "Ambessa",
  "Briar",
  "Camille",
  "Darius",
  "DrMundo",
  "Fiora",
  "Gwen",
  "Illaoi",
  "Irelia",
  "Mordekaiser",
  "Nasus",
  "Olaf",
  "Renekton",
  "Sett",
  "Swain",
  "Sylas",
  "Vladimir",
  "Volibear",
  "Warwick",
]);

const VALUABLE_WHEN_FED = new Set([
  "Ahri",
  "Akali",
  "Akshan",
  "Aphelios",
  "Aurora",
  "Azir",
  "Belveth",
  "Camille",
  "Cassiopeia",
  "Corki",
  "Draven",
  "Ekko",
  "Evelynn",
  "Fiora",
  "Fizz",
  "Graves",
  "Irelia",
  "Jax",
  "Jayce",
  "Jinx",
  "Kaisa",
  "Kalista",
  "Kassadin",
  "Katarina",
  "Kayle",
  "Khazix",
  "Kindred",
  "KogMaw",
  "Leblanc",
  "Lucian",
  "MasterYi",
  "Naafiri",
  "Nilah",
  "Qiyana",
  "Rengar",
  "Riven",
  "Samira",
  "Smolder",
  "Sylas",
  "Tristana",
  "Twitch",
  "Vayne",
  "Viego",
  "Viktor",
  "Xayah",
  "Yasuo",
  "Yone",
  "Zed",
  "Zeri",
]);

function clamp(value, min = 1, max = 5) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function deriveMainPosition(championId, tags) {
  for (const [position, set] of Object.entries(POSITION_OVERRIDES)) {
    if (set.has(championId)) {
      return position;
    }
  }

  if (tags.includes("Support")) return "support";
  if (tags.includes("Marksman")) return "adc";
  if (tags.includes("Assassin") || tags.includes("Mage")) return "mid";
  if (tags.includes("Tank") || tags.includes("Fighter")) return "top";
  return "mid";
}

function deriveRoleGroup(tags, position) {
  if (position === "adc") return "원딜";
  if (position === "support") return "서포터";
  if (tags.includes("Assassin")) return "암살자";
  if (tags.includes("Mage")) return "메이지";
  if (tags.includes("Tank")) return "탱커";
  return "전사";
}

function deriveDamageType(champion) {
  const [primaryTag] = champion.tags;
  const attack = champion.info.attack;
  const magic = champion.info.magic;

  if (
    ["Azir", "Corki", "Kaisa", "Kennen", "KogMaw", "Varus", "Kayle"].includes(
      champion.id
    )
  ) {
    return "Mixed";
  }

  if (primaryTag === "Mage" || primaryTag === "Support") {
    return attack >= magic + 2 ? "Mixed" : "AP";
  }

  if (primaryTag === "Marksman") {
    return magic >= attack + 2 ? "Mixed" : "AD";
  }

  if (primaryTag === "Assassin" || primaryTag === "Fighter") {
    return magic >= attack + 3 ? "AP" : "AD";
  }

  if (primaryTag === "Tank") {
    return magic >= attack + 2 ? "AP" : "AD";
  }

  return attack > magic ? "AD" : "AP";
}

function deriveRangeType(champion) {
  return champion.stats.attackrange >= 325 ? "Ranged" : "Melee";
}

function baseScores(roleGroup) {
  switch (roleGroup) {
    case "암살자":
      return {
        earlyPower: 4,
        scaling: 3,
        pushPower: 2,
        roaming: 4,
        laneStability: 2,
        recoveryPower: 2,
        gankSetup: 3,
        ccLevel: 2,
        burst: 5,
        divePotential: 4,
        skirmishPower: 4,
        snowballValue: 5,
      };
    case "전사":
      return {
        earlyPower: 4,
        scaling: 3,
        pushPower: 3,
        roaming: 3,
        laneStability: 3,
        recoveryPower: 3,
        gankSetup: 3,
        ccLevel: 2,
        burst: 3,
        divePotential: 4,
        skirmishPower: 4,
        snowballValue: 4,
      };
    case "메이지":
      return {
        earlyPower: 3,
        scaling: 4,
        pushPower: 4,
        roaming: 2,
        laneStability: 3,
        recoveryPower: 3,
        gankSetup: 2,
        ccLevel: 3,
        burst: 4,
        divePotential: 2,
        skirmishPower: 3,
        snowballValue: 3,
      };
    case "탱커":
      return {
        earlyPower: 2,
        scaling: 3,
        pushPower: 2,
        roaming: 2,
        laneStability: 4,
        recoveryPower: 4,
        gankSetup: 3,
        ccLevel: 4,
        burst: 1,
        divePotential: 3,
        skirmishPower: 3,
        snowballValue: 2,
      };
    case "원딜":
      return {
        earlyPower: 3,
        scaling: 5,
        pushPower: 3,
        roaming: 1,
        laneStability: 2,
        recoveryPower: 2,
        gankSetup: 1,
        ccLevel: 1,
        burst: 3,
        divePotential: 1,
        skirmishPower: 2,
        snowballValue: 5,
      };
    case "서포터":
      return {
        earlyPower: 3,
        scaling: 3,
        pushPower: 2,
        roaming: 3,
        laneStability: 3,
        recoveryPower: 3,
        gankSetup: 4,
        ccLevel: 4,
        burst: 2,
        divePotential: 2,
        skirmishPower: 3,
        snowballValue: 2,
      };
    default:
      throw new Error(`Unknown roleGroup: ${roleGroup}`);
  }
}

function applyTagAdjustments(scores, champion, position, rangeType) {
  const next = { ...scores };
  const { tags, info, stats, id } = champion;

  if (tags.includes("Assassin")) {
    next.roaming += 1;
    next.burst += 1;
    next.snowballValue += 1;
  }
  if (tags.includes("Mage")) {
    next.pushPower += 1;
    next.scaling += 1;
    next.ccLevel += 1;
  }
  if (tags.includes("Tank")) {
    next.laneStability += 1;
    next.recoveryPower += 1;
    next.ccLevel += 1;
  }
  if (tags.includes("Support")) {
    next.gankSetup += 1;
    next.ccLevel += 1;
  }
  if (tags.includes("Marksman")) {
    next.scaling += 1;
    next.snowballValue += 1;
  }
  if (tags.includes("Fighter")) {
    next.earlyPower += 1;
    next.skirmishPower += 1;
  }

  if (rangeType === "Ranged") {
    next.laneStability += 1;
    next.divePotential -= 1;
  } else {
    next.skirmishPower += 1;
    next.divePotential += 1;
  }

  if (position === "mid") {
    next.roaming += 1;
    next.pushPower += 1;
  } else if (position === "jungle") {
    next.gankSetup += 1;
    next.skirmishPower += 1;
    next.divePotential += 1;
    next.laneStability -= 1;
  } else if (position === "top") {
    next.laneStability += 1;
    next.skirmishPower += 1;
  } else if (position === "adc") {
    next.scaling += 1;
    next.roaming -= 1;
  } else if (position === "support") {
    next.gankSetup += 1;
    next.ccLevel += 1;
    next.snowballValue -= 1;
  }

  if (ROAMING_CORES.has(id)) {
    next.roaming += 2;
  }
  if (["Anivia", "Azir", "Heimerdinger", "Malzahar", "Orianna", "Syndra", "Ziggs"].includes(id)) {
    next.pushPower += 1;
  }
  if (["Draven", "Kalista", "Lucian", "Pantheon", "Renekton", "Sett"].includes(id)) {
    next.earlyPower += 1;
  }
  if (["AurelionSol", "Kassadin", "Kayle", "Smolder", "Viktor", "Vladimir", "Veigar"].includes(id)) {
    next.scaling += 1;
    next.earlyPower -= 1;
  }

  next.earlyPower += (info.attack - 5) * 0.35;
  next.scaling += ((stats.hpperlevel + stats.attackdamageperlevel) / 12 - 3) * 0.25;
  next.pushPower += (info.magic - 5) * 0.2;
  next.ccLevel += champion.spells?.length ? 0 : 0;
  next.laneStability += (info.defense - 5) * 0.25;
  next.recoveryPower += ((stats.hpregenperlevel ?? 0) - 0.8) * 0.3;
  next.burst += (info.attack + info.magic - 10) * 0.2;
  next.skirmishPower += (stats.movespeed - 330) * 0.05;
  next.snowballValue += (info.difficulty - 5) * 0.1;

  for (const key of Object.keys(next)) {
    next[key] = clamp(next[key]);
  }

  return next;
}

function buildChampionTag(champion) {
  const mainPosition = deriveMainPosition(champion.id, champion.tags);
  const roleGroup = deriveRoleGroup(champion.tags, mainPosition);
  const damageType = deriveDamageType(champion);
  const rangeType = deriveRangeType(champion);

  const scores = applyTagAdjustments(
    baseScores(roleGroup),
    champion,
    mainPosition,
    rangeType
  );

  const safeWhenBehind =
    SAFE_WHEN_BEHIND.has(champion.id) ||
    roleGroup === "탱커" ||
    roleGroup === "서포터";

  const hardToRecoverWhenBehind =
    HARD_TO_RECOVER.has(champion.id) ||
    (roleGroup === "암살자" && mainPosition !== "support") ||
    (roleGroup === "원딜" && scores.laneStability <= 2);

  const igniteSensitive =
    IGNITE_SENSITIVE.has(champion.id) ||
    (mainPosition === "top" && scores.recoveryPower >= 4);

  const valuableWhenFed =
    VALUABLE_WHEN_FED.has(champion.id) ||
    scores.snowballValue >= 5 ||
    (roleGroup === "원딜" && scores.scaling >= 5);

  return {
    championId: Number(champion.key),
    championName: champion.name,
    mainPosition,
    damageType,
    rangeType,
    roleGroup,
    earlyPower: scores.earlyPower,
    scaling: scores.scaling,
    pushPower: scores.pushPower,
    roaming: scores.roaming,
    laneStability: scores.laneStability,
    recoveryPower: scores.recoveryPower,
    gankSetup: scores.gankSetup,
    ccLevel: scores.ccLevel,
    burst: scores.burst,
    divePotential: scores.divePotential,
    skirmishPower: scores.skirmishPower,
    snowballValue: scores.snowballValue,
    safeWhenBehind,
    hardToRecoverWhenBehind,
    igniteSensitive,
    valuableWhenFed,
  };
}

async function main() {
  const versionRes = await fetch(`${DDRAGON_BASE}/api/versions.json`);
  const versions = await versionRes.json();
  const version = versions[0];

  const champRes = await fetch(
    `${DDRAGON_BASE}/cdn/${version}/data/en_US/champion.json`
  );
  const champJson = await champRes.json();
  const champions = Object.values(champJson.data);

  const tags = champions
    .map(buildChampionTag)
    .sort((a, b) => a.championName.localeCompare(b.championName, "en"));

  process.stdout.write(`${JSON.stringify(tags, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
