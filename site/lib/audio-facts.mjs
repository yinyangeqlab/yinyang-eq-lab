// Public editorial content shared by the app and the link-preview worker.
export const AUDIO_FACTS_PATH = "/glossary/audio-facts";
export const AUDIO_FACTS_TITLE = "Audio Fact Checks";
export const AUDIO_FACTS_DESCRIPTION = "Research-backed answers to common audio claims about headphones, EQ, measurements, digital formats and listening tests.";
export const audioFactTopics = ["Headphones & targets", "Measurements & EQ", "Digital audio", "Loudness & listening tests"];

/** @typedef {keyof typeof audioFactSources} SourceId */
/** @typedef {{ text: string, sources: SourceId[] }} Evidence */
/** @typedef {{ slug: string, topic: string, title: string, claim: string, verdict: string, answer: string, aliases: string[], evidence: Evidence[], takeaway: string, related: string[] }} AudioFact */

export const audioFactSources = {
  preference: { label: "Olive, Welti & Khonsaripour (2018)", title: "A Statistical Model that Predicts Listeners’ Preference Ratings of Around-Ear and On-Ear Headphones", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=19436" },
  segments: { label: "Olive, Welti & Khonsaripour (2019)", title: "Segmentation of Listeners Based on Their Preferred Headphone Sound Quality Profiles", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=20289" },
  speakerTarget: { label: "Olive, Welti & McMullin (2013)", title: "Listener Preferences for In-Room Loudspeaker and Headphone Target Responses", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=17042" },
  fixtures: { label: "Olive & Clark (2025)", title: "A Preferred Headphone Target Curve Defined for the B&K 5128 and GRAS45CA-10 Test Fixtures", kind: "AES express paper", url: "https://aes.org/publications/elibrary/elibrary-page/?id=23068" },
  iec711: { label: "IEC 60318-4:2010", title: "Occluded-ear simulator for the measurement of earphones coupled to the ear by means of ear inserts", kind: "IEC standard", url: "https://webstore.iec.ch/en/publication/1445" },
  leakage: { label: "Huang et al. (2011)", title: "Insert earphone modeling and measurement by IEC-60711 coupler", kind: "IEEE Transactions on Ultrasonics, Ferroelectrics, and Frequency Control study", url: "https://pubmed.ncbi.nlm.nih.gov/21342831/" },
  seal: { label: "Schulein & Fligor (2016)", title: "In Situ Subjective and Objective Acoustic Seal Performance Tests for Insert Earphones", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=18445" },
  distortion: { label: "Temme et al. (2014)", title: "The Correlation between Distortion Audibility and Listener Preference in Headphones", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=17441" },
  distortionNew: { label: "Olive & Lelièvre (2026)", title: "The Perception and Measurement of Nonlinear Distortion in Headphones", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=23209" },
  spatial: { label: "Wightman & Kistler (1989)", title: "Headphone simulation of free-field listening. II: Psychophysical validation", kind: "Journal of the Acoustical Society of America study", url: "https://pubmed.ncbi.nlm.nih.gov/2926001/" },
  spatialGeneric: { label: "Wenzel et al. (1993)", title: "Localization using nonindividualized head-related transfer functions", kind: "Journal of the Acoustical Society of America study", url: "https://pubmed.ncbi.nlm.nih.gov/8354753/" },
  phase: { label: "Liski, Mäkivirta & Välimäki (2018)", title: "Audibility of Loudspeaker Group-Delay Characteristics", kind: "AES convention study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=19404" },
  phaseFilter: { label: "Preis & Bloom (1984)", title: "Perception of Phase Distortion in Anti-Alias Filters", kind: "Journal of the Audio Engineering Society study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=4476" },
  filters: { label: "W3C Audio EQ Cookbook", title: "Audio EQ Cookbook", kind: "W3C technical note", url: "https://www.w3.org/TR/audio-eq-cookbook/" },
  webAudio: { label: "W3C Web Audio API", title: "Web Audio API, BiquadFilterNode", kind: "W3C recommendation", url: "https://www.w3.org/TR/webaudio/#BiquadFilterNode" },
  sampling: { label: "Shannon (1949)", title: "Communication in the Presence of Noise", kind: "Proceedings of the IRE", url: "https://doi.org/10.1109/JRPROC.1949.232969" },
  dither: { label: "Wannamaker et al. (2000)", title: "A Theory of Nonsubtractive Dither", kind: "IEEE Transactions on Signal Processing", url: "https://doi.org/10.1109/78.823976" },
  hiRes: { label: "Reiss (2016)", title: "A Meta-Analysis of High Resolution Audio Perceptual Evaluation", kind: "Journal of the Audio Engineering Society meta-analysis", url: "https://doi.org/10.17743/jaes.2016.0015" },
  cdLoop: { label: "Meyer & Moran (2007)", title: "Audibility of a CD-Standard A/DA/A Loop Inserted into High-Resolution Audio Playback", kind: "Journal of the Audio Engineering Society study", url: "https://aes.org/publications/elibrary/elibrary-page/?id=14195" },
  flac: { label: "RFC 9639 (2024)", title: "Free Lossless Audio Codec (FLAC)", kind: "IETF specification", url: "https://www.rfc-editor.org/rfc/rfc9639.html" },
  opus: { label: "RFC 6716 (2012)", title: "Definition of the Opus Audio Codec", kind: "IETF specification", url: "https://www.rfc-editor.org/rfc/rfc6716.html" },
  loudness: { label: "ITU-R BS.1770-5 (2023)", title: "Algorithms to measure audio programme loudness and true-peak audio level", kind: "ITU recommendation", url: "https://www.itu.int/rec/R-REC-BS.1770-5-202311-I" },
  broadcast: { label: "EBU R 128 (2023)", title: "Loudness normalisation and permitted maximum level of audio signals", kind: "EBU recommendation", url: "https://tech.ebu.ch/publications/r128" },
  spotify: { label: "Spotify for Artists", title: "Loudness normalization on Spotify", kind: "Platform documentation", url: "https://support.spotify.com/us/artists/article/loudness-normalization/" },
  blind: { label: "ITU-R BS.1116-3 (2015)", title: "Methods for the subjective assessment of small impairments in audio systems", kind: "ITU recommendation", url: "https://www.itu.int/rec/R-REC-BS.1116-3-201502-I" },
  mushra: { label: "ITU-R BS.1534-3 (2015)", title: "Method for the subjective assessment of intermediate quality level of audio systems", kind: "ITU recommendation", url: "https://www.itu.int/rec/R-REC-BS.1534/en" },
  abx: { label: "Clark (1982)", title: "High-Resolution Subjective Testing Using a Double-Blind Comparator", kind: "Journal of the Audio Engineering Society paper", url: "https://aes.org/publications/elibrary/elibrary-page/?id=3839" },
  equalLoudness: { label: "Suzuki & Takeshima (2004)", title: "Equal-loudness-level contours for pure tones", kind: "Journal of the Acoustical Society of America study", url: "https://pubmed.ncbi.nlm.nih.gov/15376658/" },
  iso226: { label: "ISO 226:2023", title: "Acoustics — Normal equal-loudness-level contours", kind: "ISO standard", url: "https://www.iso.org/standard/83117.html" },
};

const [headphones, measurement, digital, listening] = audioFactTopics;

/** @type {AudioFact[]} */
export const audioFacts = [
  {
    slug: "harman-target", topic: headphones, title: "Does everyone prefer the Harman target?",
    claim: "The Harman target is the objectively best sound for every listener.",
    verdict: "Overgeneralized", answer: "The Harman target predicts group preference in controlled tests. Individual listeners can prefer a different tonal balance.",
    aliases: ["Harman curve", "best headphone target", "target preference", "bass preference", "neutral tuning"],
    evidence: [
      { text: "In an AES convention study, 130 trained and untrained listeners rated headphone responses reproduced through one equalized headphone. The researchers used the results to build a model for predicting preference across the tested responses.", sources: ["preference"] },
      { text: "A later reanalysis identified groups with different preference profiles even though listeners on average favored responses close to the target. A statistical prediction of group ratings gives no verdict on one person’s taste.", sources: ["segments"] },
    ],
    takeaway: "Use a target as a starting point. Compare alternatives at matched levels and keep the one you prefer.",
    related: ["flat-frequency-response", "blind-tests", "different-measurement-rigs"],
  },
  {
    slug: "flat-frequency-response", topic: headphones, title: "Should a neutral headphone graph be flat?",
    claim: "A flat raw trace is the definition of a neutral headphone.",
    verdict: "Misused term", answer: "A flat line means different things on raw and compensated graphs. On a target-compensated graph it means a match to the named reference.",
    aliases: ["neutral", "raw graph", "compensated graph", "frequency response", "flat headphones", "flat line"],
    evidence: [
      { text: "Headphone and loudspeaker work distinguishes a loudspeaker’s response in the room from the response reproduced by the headphone at an eardrum reference point. The measurement location and reference are part of what any curve means.", sources: ["speakerTarget"] },
      { text: "Subtracting a target from a measured response in decibels gives the deviation from that target. Zero deviation means agreement with that reference on that rig. Published target work shows that moving between fixtures can change the appropriate target.", sources: ["fixtures"] },
    ],
    takeaway: "Ask which fixture produced the plot and which target, if any, was subtracted.",
    related: ["harman-target", "different-measurement-rigs"],
  },
  {
    slug: "headphone-soundstage", topic: headphones, title: "Can two headphone drivers reproduce spatial cues?",
    claim: "Two drivers can only reproduce left and right, so headphone soundstage is imaginary.",
    verdict: "Incorrect", answer: "Two channels can carry cues for direction and space. The resulting perception depends on the signals and how they reach the listener’s ears.",
    aliases: ["soundstage", "imaging", "binaural", "HRTF", "spatial audio", "front back", "virtual surround"],
    evidence: [
      { text: "Wightman and Kistler used individualized head-related transfer functions to deliver spatial cues through headphones. Eight listeners often localized the simulated sounds close to the real source positions, though front/back confusions were more frequent and elevation was less distinct.", sources: ["spatial"] },
      { text: "A follow-up that used a generic set of transfer functions found more directional confusions for many listeners. These experiments test controlled localization; they do not rank ordinary headphones by how wide they sound on stereo music.", sources: ["spatialGeneric"] },
    ],
    takeaway: "Say what you heard: a wide image, a sound outside your head, or better localization. They are different observations.",
    related: ["phase-audibility", "blind-tests"],
  },
  {
    slug: "iem-seal-and-bass", topic: measurement, title: "Can a poor IEM seal reduce bass?",
    claim: "Bass cannot change if the earphone and volume setting stay the same.",
    verdict: "Incorrect", answer: "Fit is part of the acoustic system. A leak can change frequency response, so the same IEM can measure and sound different after reseating.",
    aliases: ["ear tip", "ear tips", "earbuds", "no bass", "weak bass", "poor fit", "leakage", "seal", "coupler"],
    evidence: [
      { text: "Schulein and Fligor measured a loss of about 15 dB at 50 Hz for one small leak in their test setup. Huang and colleagues separately found that a front leak changed low-frequency response in an insert earphone model and measurements.", sources: ["seal", "leakage"] },
      { text: "One placement cannot separate a tuning difference from a fit problem. The IEC simulator does not reproduce leakage between an earmould and a human ear canal, and the size of the effect depends on the fit and design.", sources: ["iec711", "seal"] },
    ],
    takeaway: "Reseat the IEM, check each side more than once and compare the bass before adjusting EQ.",
    related: ["711-coupler-treble", "different-measurement-rigs"],
  },
  {
    slug: "711-coupler-treble", topic: measurement, title: "Is a 711 coupler accurate all the way to 20 kHz?",
    claim: "A 711 graph is equally reliable across its entire plotted frequency range.",
    verdict: "Overgeneralized", answer: "A plotted sweep can extend beyond the simulator’s specified range. IEC 60318-4 specifies ear simulation from 100 Hz to 10 kHz.",
    aliases: ["711", "60318-4", "10 khz", "8 khz peak", "20 khz", "upper treble", "coupler accuracy", "resonance"],
    evidence: [
      { text: "The IEC distinguishes its ear-simulation range from using the device as a general acoustic coupler outside that range. A graph continuing above 10 kHz does not extend the ear-simulation specification.", sources: ["iec711"] },
      { text: "The standard also notes differences between individual human ears and the simulator. A single high-frequency peak from one fit on a coupler is weak evidence for what any particular listener hears.", sources: ["iec711"] },
    ],
    takeaway: "Report the fixture and fit, repeat placements, and avoid using a lone treble peak as an exact EQ prescription.",
    related: ["iem-seal-and-bass", "different-measurement-rigs"],
  },
  {
    slug: "different-measurement-rigs", topic: measurement, title: "Can you compare 711 and 5128 graphs directly?",
    claim: "Raw curves from different rigs should match if the measurements are correct.",
    verdict: "Incorrect", answer: "Different simulators can load the same headphone differently. Use a reference appropriate to each fixture and document the setup.",
    aliases: ["B&K 5128", "Bruel & Kjaer", "GRAS", "711 vs 5128", "target conversion", "cross rig", "measurement comparison"],
    evidence: [
      { text: "An AES study compared an established GRAS-based around-ear/on-ear target with fixture-specific variants for the B&K 5128 and two GRAS setups. It discusses how differences in acoustic transfer impedance can create errors when a target is reused on another fixture.", sources: ["fixtures"] },
      { text: "That work tests specific targets and fixtures. It does not establish that one fixed offset converts every headphone, IEM, clone fixture or placement perfectly.", sources: ["fixtures", "iec711"] },
    ],
    takeaway: "For small differences, prefer measurements made on the same rig with the same procedure.",
    related: ["flat-frequency-response", "711-coupler-treble", "iem-seal-and-bass"],
  },
  {
    slug: "eq-q-and-gain", topic: measurement, title: "Is Q another way to express EQ gain?",
    claim: "A higher Q always makes an EQ boost stronger.",
    verdict: "Misused term", answer: "For a conventional parametric bell, gain sets the center boost or cut. At fixed frequency and gain, higher Q narrows the affected band.",
    aliases: ["parametric EQ", "quality factor", "bandwidth", "bell filter", "peaking filter", "Q factor", "shelf filter"],
    evidence: [
      { text: "The W3C cookbook gives separate parameters for gain and Q in a peaking filter. A +4 dB peak at 1 kHz stays +4 dB at its center as you change Q, while the width changes.", sources: ["filters", "webAudio"] },
      { text: "The cookbook distinguishes bell Q from shelf slope, and Web Audio defines which filter types use Q. A control labeled Q, bandwidth or slope is not interchangeable across all filters and implementations.", sources: ["filters", "webAudio"] },
    ],
    takeaway: "When sharing a preset, give the filter type, center frequency, gain and Q or bandwidth with its units.",
    related: ["eq-boost-and-clipping", "flat-frequency-response"],
  },
  {
    slug: "eq-boost-and-clipping", topic: measurement, title: "Does positive EQ gain always cause clipping?",
    claim: "Any positive EQ gain clips digital audio, and cuts alone guarantee safety.",
    verdict: "Overgeneralized", answer: "Clipping depends on the signal level after processing and the ceiling of that stage. A boost can fit when enough headroom is available.",
    aliases: ["negative preamp", "positive gain", "headroom", "PEQ clipping", "cut only EQ", "0 dBFS", "overlapping filters"],
    evidence: [
      { text: "Peaking and shelving filters apply gain over a range. In a chain, overlapping responses combine, so the largest individual boost may understate the largest combined boost. Reducing preamp gain before those filters creates headroom.", sources: ["filters", "webAudio"] },
      { text: "Combined response is a starting estimate. A frequency-response plot gives steady-state gain versus frequency, while a true-peak meter estimates reconstructed waveform peaks. Check the actual output if the margin is small.", sources: ["webAudio", "loudness"] },
    ],
    takeaway: "Review the combined response, leave margin with preamp gain and check the output for peaks.",
    related: ["eq-q-and-gain", "sample-peak-vs-true-peak"],
  },
  {
    slug: "headphone-distortion", topic: measurement, title: "Does lower headphone THD always sound better?",
    claim: "The headphone with the lowest distortion percentage necessarily sounds best.",
    verdict: "Overgeneralized", answer: "A single total harmonic distortion (THD) figure cannot rank overall sound quality or establish audibility.",
    aliases: ["THD", "distortion percentage", "audible distortion", "nonlinear distortion", "sound quality", "masking"],
    evidence: [
      { text: "Temme and colleagues controlled frequency response before listeners compared five headphones. That isolates a different question from comparing headphones as sold, where their response can vary substantially.", sources: ["distortion", "preference"] },
      { text: "Olive and Lelièvre compared multiple distortion metrics and perceptual results with level and response differences removed from recordings. Frequency, playback level and the music used matter when judging whether a difference will be audible.", sources: ["distortionNew"] },
    ],
    takeaway: "Ask for distortion across frequency at a specified test level and look for listening evidence before treating a number as audible.",
    related: ["phase-audibility", "harman-target", "blind-tests"],
  },
  {
    slug: "phase-audibility", topic: measurement, title: "Is phase distortion always audible or always inaudible?",
    claim: "Any phase shift ruins sound quality, or phase never matters at all.",
    verdict: "Overgeneralized", answer: "Phase audibility depends on the change, its frequency range, the test signal and the listening conditions.",
    aliases: ["phase shift", "group delay", "linear phase", "minimum phase", "phase distortion", "time smear"],
    evidence: [
      { text: "Liski and colleagues tested the audibility of loudspeaker group-delay characteristics, which describe frequency-dependent delay. Their results concern the changes and test material they used, so they cannot provide a universal threshold.", sources: ["phase"] },
      { text: "Preis and Bloom found audible differences for certain anti-alias filter configurations under their test conditions. This establishes that phase distortion can matter in specific cases, without making every phase difference audible in music.", sources: ["phaseFilter"] },
    ],
    takeaway: "Specify what changed and test with matched magnitude response and level before attributing a difference to phase.",
    related: ["headphone-distortion", "blind-tests"],
  },
  {
    slug: "digital-stair-steps", topic: digital, title: "Does digital audio play back as stair steps?",
    claim: "A PCM plot with steps is the analog waveform you hear.",
    verdict: "Incorrect", answer: "PCM stores sampled values. A stair-step drawing can show a sample-and-hold stage or plotting choice; it is not the intended reconstructed waveform.",
    aliases: ["staircase", "stair steps", "PCM", "Nyquist", "sampling theorem", "DAC", "44.1 kHz", "smooth wave", "sample rate"],
    evidence: [
      { text: "The sampling theorem shows that a signal band-limited below half the sample rate can be reconstructed from its samples under ideal conditions. Reconstruction is not drawing straight segments or holding each sample value to the next one.", sources: ["sampling"] },
      { text: "The theorem assumes ideal band limiting and exact sample values. Practical converter filters and finite bit depth introduce separate engineering limits; finer steps in a drawing are not evidence that a higher rate sounds better.", sources: ["sampling", "dither", "hiRes"] },
    ],
    takeaway: "Look at the reconstructed signal and filtering when discussing converter output.",
    related: ["high-resolution-audio", "bit-depth-and-dither", "sample-peak-vs-true-peak"],
  },
  {
    slug: "bit-depth-and-dither", topic: digital, title: "Does 24-bit audio add more treble than 16-bit audio?",
    claim: "More bits per PCM sample increase the highest frequency the file can store.",
    verdict: "Misused term", answer: "Bit depth concerns amplitude quantization. At the same sample rate, increasing bit depth does not extend the representable bandwidth.",
    aliases: ["16 bit", "24 bit", "32 bit", "bit depth", "dither", "noise floor", "quantization", "dynamic range", "sample rate"],
    evidence: [
      { text: "Sample rate sets the ideal bandwidth limit. With otherwise comparable linear PCM quantization, more bits give finer amplitude steps and can lower quantization noise.", sources: ["sampling", "dither"] },
      { text: "When reducing bit depth, appropriate dither adds a small amount of noise to avoid signal-dependent quantization artifacts. It does not restore removed information or increase the highest representable frequency.", sources: ["dither", "sampling"] },
    ],
    takeaway: "Compare sample rate for bandwidth and bit depth for amplitude resolution. Audibility is a separate claim.",
    related: ["digital-stair-steps", "high-resolution-audio"],
  },
  {
    slug: "high-resolution-audio", topic: digital, title: "Is hi-res audio always audibly better than CD quality?",
    claim: "A hi-res badge guarantees an audible upgrade over CD quality.",
    verdict: "Evidence is mixed", answer: "Some controlled tests find differences and others do not. Detecting a difference does not show which version sounds better.",
    aliases: ["hi res", "hi-res", "high resolution", "CD quality", "24 96", "16 44.1", "192 kHz", "audiophile"],
    evidence: [
      { text: "Meyer and Moran’s double-blind experiment did not detect the inserted 16-bit/44.1 kHz loop at normal-to-loud levels in their setups. Reiss’s meta-analysis found a small overall ability to discriminate, stronger in studies with extensive training.", sources: ["cdLoop", "hiRes"] },
      { text: "Those findings address specific conversion chains and test designs. They neither guarantee audible improvements in everyday playback nor show that all versions of an album use the same master.", sources: ["cdLoop", "hiRes"] },
    ],
    takeaway: "Use the same master, match levels and test detection separately from preference.",
    related: ["blind-tests", "digital-stair-steps", "bit-depth-and-dither", "bitrate-and-lossless"],
  },
  {
    slug: "bitrate-and-lossless", topic: digital, title: "Does a higher bitrate always mean better sound?",
    claim: "The file with the higher kbps is automatically higher quality.",
    verdict: "Overgeneralized", answer: "Bitrate counts bits per second. It does not identify the source, the codec, or whether the decoded samples match the original.",
    aliases: ["kbps", "FLAC", "WAV", "Opus", "MP3", "AAC", "lossy", "lossless", "compression", "bit rate"],
    evidence: [
      { text: "FLAC reconstructs its input PCM samples exactly. Two FLAC encodes of the same PCM can use different amounts of data while decoding to identical samples.", sources: ["flac"] },
      { text: "Opus is lossy and supports several modes and bitrates. Its bits-per-second figure does not tell you how another codec will perform or whether both encoders received the same master. Putting a lossy decode into FLAC preserves that decode, without recovering discarded information.", sources: ["opus", "flac"] },
    ],
    takeaway: "Check source and codec before comparing bitrates. For identical PCM, compare decoded samples.",
    related: ["high-resolution-audio", "bit-depth-and-dither"],
  },
  {
    slug: "lufs-vs-peak-level", topic: listening, title: "Are LUFS, dBFS and dB SPL the same?",
    claim: "A peak reading tells you the loudness of a track and how loud it is in your room.",
    verdict: "Misused term", answer: "Integrated LUFS measures programme loudness. Sample peak in dBFS measures digital peak amplitude. SPL describes physical sound pressure.",
    aliases: ["volume", "loudness units", "lufs", "dbfs", "spl", "integrated loudness", "peak normalization", "same peak different loudness"],
    evidence: [
      { text: "ITU-R BS.1770 defines separate algorithms for programme loudness and true peak. Loudness uses frequency-weighted energy with gating over the programme. Two tracks with the same maximum sample can have very different values over time.", sources: ["loudness", "broadcast"] },
      { text: "A digital loudness or peak meter does not measure physical pressure at your ear. Actual SPL depends on the calibrated playback path and where the pressure is measured.", sources: ["loudness", "iso226"] },
    ],
    takeaway: "Use LUFS for programme loudness, peak meters for headroom and an appropriate calibrated measurement for SPL.",
    related: ["sample-peak-vs-true-peak", "minus-14-lufs", "equal-loudness-curves"],
  },
  {
    slug: "sample-peak-vs-true-peak", topic: listening, title: "Can audio clip even when no sample reaches 0 dBFS?",
    claim: "A sample peak below 0 dBFS guarantees the reconstructed signal cannot overload.",
    verdict: "Incorrect", answer: "The reconstructed waveform can peak between samples. A true-peak estimate checks for peaks a sample meter can miss.",
    aliases: ["intersample peak", "inter sample peak", "sample peak", "true peak", "dBTP", "dBFS clipping", "analog overload"],
    evidence: [
      { text: "ITU-R BS.1770 Annex 2 defines true-peak estimation using an oversampled signal. A sample meter reads the stored values; it does not evaluate the waveform between them.", sources: ["loudness", "sampling"] },
      { text: "A true-peak value indicates a possible overload at a downstream stage with insufficient headroom. The meter is an estimate, and the actual result depends on what the playback chain can handle.", sources: ["loudness", "broadcast"] },
    ],
    takeaway: "Check true peak for delivery or playback headroom. Follow the spec for the destination.",
    related: ["lufs-vs-peak-level", "eq-boost-and-clipping", "minus-14-lufs"],
  },
  {
    slug: "minus-14-lufs", topic: listening, title: "Must every master hit −14 LUFS?",
    claim: "All streaming releases must be mastered to −14 LUFS.",
    verdict: "Incorrect", answer: "A service’s playback normalization setting is not a universal mastering or delivery requirement.",
    aliases: ["-14 LUFS", "minus 14 LUFS", "Spotify", "streaming normalization", "mastering target", "broadcast", "minus 23"],
    evidence: [
      { text: "Spotify documents −14 LUFS as its normal playback reference and gives it as a mastering tip. Its documentation describes normalization at playback and variations by setting or playback path.", sources: ["spotify"] },
      { text: "EBU R 128 instead recommends −23 LUFS for its programme-loudness context. The two numbers address different delivery and playback contexts; neither defines the best artistic dynamics for every master.", sources: ["broadcast", "spotify"] },
    ],
    takeaway: "Check the current delivery spec and distinguish playback gain, artistic dynamics and peak headroom.",
    related: ["lufs-vs-peak-level", "sample-peak-vs-true-peak"],
  },
  {
    slug: "blind-tests", topic: listening, title: "What does a blind audio test actually prove?",
    claim: "A successful ABX proves which sounds better, and a failed ABX proves they are identical.",
    verdict: "Misused term", answer: "ABX tests discrimination: can a listener identify whether X is A or B? Preference is a separate question, and a null result has limits.",
    aliases: ["ABX", "double blind", "A/B test", "listening test", "MUSHRA", "preference vs discrimination", "level matching", "null result", "statistical power"],
    evidence: [
      { text: "An ABX task asks for identity rather than liking. Successful discrimination supports audibility under the tested conditions. Failure to reach a detection criterion means the test did not show a difference; sensitivity depends on trials, listeners, material and conditions.", sources: ["abx", "blind"] },
      { text: "Different listening methods answer different questions. ITU-R BS.1116 addresses small impairments, while BS.1534 uses a hidden reference and anchors for intermediate quality. A preference test should ask for preference explicitly.", sources: ["blind", "mushra"] },
    ],
    takeaway: "Match levels, hide identities and decide in advance whether the question is audibility, quality or preference.",
    related: ["high-resolution-audio", "harman-target", "phase-audibility"],
  },
  {
    slug: "equal-loudness-curves", topic: listening, title: "Can you use Fletcher–Munson curves as headphone EQ?",
    claim: "An equal-loudness contour is a universal EQ target for music.",
    verdict: "Misused term", answer: "Equal-loudness contours describe how much SPL different tones need to sound equally loud under defined conditions. They are not headphone preference curves.",
    aliases: ["Fletcher Munson", "ISO 226", "equal loudness", "phon", "loudness compensation", "quiet listening", "bass at low volume"],
    evidence: [
      { text: "Equal-loudness research measures pure tones at different levels. ISO 226 limits its standardized contours to specific conditions, including a frontal free-field source and young adults with normal hearing.", sources: ["equalLoudness", "iso226"] },
      { text: "A music preference target addresses spectral balance through a playback system, using music and listener judgments. Applying an entire tone contour as music EQ is a different task from using changes between contours to inform level-dependent compensation.", sources: ["iso226", "speakerTarget"] },
    ],
    takeaway: "Use equal-loudness curves to understand level-dependent perception. Choose headphone EQ by fit, measurement and listening.",
    related: ["harman-target", "flat-frequency-response", "lufs-vs-peak-level"],
  },
];

/** @param {string} slug */
export function findAudioFact(slug) {
  return audioFacts.find(fact => fact.slug === slug);
}

/** @param {string} slug */
export function audioFactPath(slug) {
  return `${AUDIO_FACTS_PATH}/${slug}`;
}

/** @param {AudioFact} fact */
export function audioFactSourceIds(fact) {
  return [...new Set(fact.evidence.flatMap(item => item.sources))];
}
