// Publication-approved entries. Original preset files are separate build inputs.
export const approvedEqModels = [
  {
    id: "hifiman-arya-stealth",
    name: "HiFiMAN Arya Stealth",
    type: "oe",
    presets: [
      {
        id: "arya-stealth-v3",
        name: "Arya Stealth Personal EQ v3",
        credit: "trudenpa",
        tags: ["Diamond", "YYT1"],
        preview: {
          path: "/eq-presets/arya-stealth-v3.txt",
          sha256: "4cc7eb3f648b7199ba3e187c18a9f00e178a05dc947e33e8de80eecfb1c53377",
        },
      },
    ],
    pairs: [],
  },
] as const;
