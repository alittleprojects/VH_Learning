window.CATALOG_DATA = {
  meta: {
    title: "V&H Catalog",
    updatedAt: "2026-11-17",
    note: "База устройств Vaporesso"
  },

  coils: [
    // XROS Series (для XROS 3/4/5/6/Cube/Pro)
    { id:"xros-04", brand:"Vaporesso", name:"XROS Series Cartridge", resistance:"0.4Ω",
      type:"картридж", price:490, image:"", description:"Сетчатый испаритель. Для свободной затяжки, сладкие и фруктовые жидкости." },
    { id:"xros-06", brand:"Vaporesso", name:"XROS Series Cartridge", resistance:"0.6Ω",
      type:"картридж", price:450, image:"", description:"Универсальный. Подходит для MTL и полу-свободной затяжки." },
    { id:"xros-08", brand:"Vaporesso", name:"XROS Series Cartridge", resistance:"0.8Ω",
      type:"картридж", price:450, image:"", description:"Классическая сигаретная затяжка. Для солевых жидкостей 10-20 мг." },
    { id:"xros-10", brand:"Vaporesso", name:"XROS Series Cartridge", resistance:"1.0Ω",
      type:"картридж", price:450, image:"", description:"Тугая MTL-затяжка. Для крепких солевых жидкостей 20 мг." },
    { id:"xros-12", brand:"Vaporesso", name:"XROS Series Cartridge", resistance:"1.2Ω",
      type:"картридж", price:450, image:"", description:"Самая тугая затяжка. Максимальная экономия жидкости." },

    // GTX (для Armour G/GS)
    { id:"gtx-015", brand:"Vaporesso", name:"GTX Mesh", resistance:"0.15Ω",
      type:"испаритель", price:420, image:"", description:"Для свободной затяжки, высокие мощности." },
    { id:"gtx-03", brand:"Vaporesso", name:"GTX Mesh", resistance:"0.3Ω",
      type:"испаритель", price:390, image:"", description:"Универсальный GTX для субомных баков." },
    { id:"gtx-06", brand:"Vaporesso", name:"GTX Mesh", resistance:"0.6Ω",
      type:"испаритель", price:390, image:"", description:"Для MTL и полу-свободной затяжки." },

    // Eco Nano
    { id:"eco-08", brand:"Vaporesso", name:"Eco Nano Pod", resistance:"0.8Ω",
      type:"картридж", price:380, image:"", description:"Для Eco Nano. MTL-затяжка." },
    { id:"eco-12", brand:"Vaporesso", name:"Eco Nano Pod", resistance:"1.2Ω",
      type:"картридж", price:380, image:"", description:"Для Eco Nano. Тугая затяжка." },

    // Veco Go
    { id:"veco-08", brand:"Vaporesso", name:"Veco Go Pod", resistance:"0.8Ω",
      type:"картридж", price:350, image:"", description:"Для Veco Go. Бюджетный вариант." },
    { id:"veco-12", brand:"Vaporesso", name:"Veco Go Pod", resistance:"1.2Ω",
      type:"картридж", price:350, image:"", description:"Для Veco Go. Тугая затяжка." }
  ],

  devices: [
    // XROS 6 (новинка)
    { id:"dev-xros-6", brand:"Vaporesso", model:"XROS 6", type:"POD", popular:true,
      price:1890, image:"",
      description:"Флагманская модель 2026. Улучшенная батарея, быстрая зарядка, регулировка обдува.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },
    { id:"dev-xros-6-mini", brand:"Vaporesso", model:"XROS 6 mini", type:"POD", popular:false,
      price:1690, image:"",
      description:"Компактная версия XROS 6. Без регулировки мощности.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },

    // XROS 5
    { id:"dev-xros-5", brand:"Vaporesso", model:"XROS 5", type:"POD", popular:true,
      price:1790, image:"",
      description:"Популярная модель. Регулировка обдува, Type-C, 1000 мАч.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },
    { id:"dev-xros-5-mini", brand:"Vaporesso", model:"XROS 5 mini", type:"POD", popular:false,
      price:1590, image:"",
      description:"Компактная версия XROS 5. Для новичков.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },

    // XROS 4
    { id:"dev-xros-4", brand:"Vaporesso", model:"XROS 4", type:"POD", popular:true,
      price:1590, image:"",
      description:"Топ-продаж. Регулировка обдува, Type-C, 1000 мАч.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },
    { id:"dev-xros-4-mini", brand:"Vaporesso", model:"XROS 4 mini", type:"POD", popular:false,
      price:1390, image:"",
      description:"Компактная версия XROS 4.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },

    // XROS 3
    { id:"dev-xros-3", brand:"Vaporesso", model:"XROS 3", type:"POD", popular:true,
      price:1290, image:"",
      description:"Классическая модель. Надёжная и проверенная.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },
    { id:"dev-xros-3-mini", brand:"Vaporesso", model:"XROS 3 mini", type:"POD", popular:false,
      price:1190, image:"",
      description:"Бюджетная версия XROS 3.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },

    // XROS Pro
    { id:"dev-xros-pro", brand:"Vaporesso", model:"XROS Pro", type:"POD", popular:true,
      price:1990, image:"",
      description:"Продвинутая версия XROS. Экран, регулировка мощности до 16W.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },
    { id:"dev-xros-pro-2", brand:"Vaporesso", model:"XROS Pro 2", type:"POD", popular:false,
      price:2190, image:"",
      description:"Новое поколение XROS Pro. Улучшенная батарея и дисплей.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },

    // XROS Cube
    { id:"dev-xros-cube", brand:"Vaporesso", model:"XROS Cube", type:"POD", popular:false,
      price:1490, image:"",
      description:"Кубический дизайн. Компактный и стильный.",
      coils:["xros-04","xros-06","xros-08","xros-10","xros-12"] },

    // Armour G / GS (Pod-Mod)
    { id:"dev-armour-g", brand:"Vaporesso", model:"Armour G", type:"Pod-Mod", popular:true,
      price:2590, image:"",
      description:"Мощный Pod-Mod. Регулировка мощности до 80W, GTX испарители.",
      coils:["gtx-015","gtx-03","gtx-06"] },
    { id:"dev-armour-gs", brand:"Vaporesso", model:"Armour GS", type:"Pod-Mod", popular:false,
      price:2790, image:"",
      description:"Флагманский Pod-Mod. До 100W, премиальные материалы.",
      coils:["gtx-015","gtx-03","gtx-06"] },

    // Eco Nano
    { id:"dev-eco-nano", brand:"Vaporesso", model:"Eco Nano", type:"POD", popular:false,
      price:990, image:"",
      description:"Бюджетный POD. Простой и надёжный.",
      coils:["eco-08","eco-12"] },

    // Veco Go
    { id:"dev-veco-go", brand:"Vaporesso", model:"Veco Go", type:"POD", popular:false,
      price:890, image:"",
      description:"Самый доступный POD в линейке Vaporesso.",
      coils:["veco-08","veco-12"] }
  ]
};
