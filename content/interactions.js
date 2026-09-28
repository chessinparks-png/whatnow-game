// WHAT NOW? — interaction layer for the V1 content pack.
//
// The pack (what_now_v1_vertical_slice.json) is the authoritative curriculum:
// concepts, prompts, answers, explanations, scenarios, connections, boss cases,
// sources. It does not say *how* each prompt is played (which choices to offer,
// which answers are traps, what information is missing). That is what this file
// adds. Nothing here replaces the pack's ideas; it only makes them playable.
//
// Every choice list below is app-authored (sourceStatus: app interaction).
// Correct answers always come from the pack itself:
//   - level questions: `correct` indexes the option that matches pack `answer`
//   - scenarios: option ids are the pack's `supported` tags
//
// Plain data. Loaded by <script> so the app works from file://.

window.WN_INTERACTIONS = {
  // ---------------------------------------------------------------------------
  // Labels for scenario `supported` tags and extra app-authored options.
  tags: {
    assimilation: "Assimilation",
    integration: "Integration",
    representation: "Representation",
    institutional_power: "Institutional power",
    collective_capacity: "Collective capacity",
    organizing: "Organizing",
    mutual_aid: "Mutual aid",
    right_view: "Right View",
    right_speech: "Right Speech",
    perception: "Perception",
    ownership: "Ownership",
    not_enough_evidence: "Not enough evidence",
    institutional_norms: "Pressure from institutional norms",
    who_sets_the_norm: "Who sets the norm?",
    assimilation_risk: "What must students become to be rewarded?",
    institutional_power_gap: "A gap in institutional power",
    voice: "Voice",
    democratic_governance: "Democratic governance",
    partial_power: "Real but bounded authority",
    possible_early_capacity: "Possible early capacity — durability unclear",
    institution_building: "Institution-building",
    coalition_like_coordination: "Coalition-like coordination",
    charity_or_donation: "Charity or donation",
    notice_condition: "Notice the feeling",
    investigate_cause: "Look at what is feeding it",
    multiple_levels: "More than one level is involved",
    clear_seeing: "Clear seeing",
    uncertainty: "Holding uncertainty",
    truthfulness_problem: "Truthfulness",
    truthful_purposeful_speech_possible: "Truthful, purposeful criticism is possible",
    right_speech_concern: "Right Speech",
    organizing_quality: "The quality of the organizing",
    no: "No",
    structural_fact_can_be_real: "A structural fact can be real",
    B: "The proposal was rejected."
  },

  // The five distinctions the game returns to again and again.
  anchors: {
    concept_integration: "Can I enter?",
    concept_representation: "Who is visible?",
    concept_institutional_power: "Who decides?",
    concept_collective_capacity: "What durable ability did the group gain?",
    concept_assimilation: "What must I become, suppress, or leave behind to belong?"
  },

  // Key distinction shown in the Library.
  contrasts: {
    concept_assimilation: "Integration is access. Assimilation is the terms of belonging.",
    concept_integration: "Entry is not control. Integration can rise while authority stays put.",
    concept_representation: "Visibility is not authority. Who is seen is not who decides.",
    concept_institutional_power: "Presence tells you who is in the room. Power asks who can bind the outcome.",
    concept_collective_capacity: "One person rising is not the group gaining a durable ability.",
    concept_organizing: "Mobilizing gathers people once. Organizing builds structure for repeated action.",
    concept_mutual_aid: "Charity flows one way. Mutual aid circulates among participants.",
    concept_right_view: "Not the approved opinion — knowledge of a problem, its causes, its stopping, and the path.",
    concept_right_speech: "Not politeness. Truthful, not divisive, not abusive, not idle.",
    concept_perception: "The condition can be real. The story added to it is a separate thing."
  },

  // Where a concept first appears. Initial set is visible from the start;
  // the rest arrive one per session, in this order.
  unlock: {
    initial: [
      "concept_integration",
      "concept_representation",
      "concept_institutional_power",
      "concept_right_view",
      "concept_perception"
    ],
    queue: [
      "concept_right_view",
      "concept_assimilation",
      "concept_collective_capacity",
      "concept_organizing",
      "concept_mutual_aid",
      "concept_right_speech"
    ]
  },

  // The curated first session: teaches the grammar of the game.
  firstSession: [
    { slot: "new", kind: "level", conceptId: "concept_integration", stage: "recognize" },
    { slot: "new", kind: "level", conceptId: "concept_representation", stage: "recognize" },
    { slot: "new", kind: "level", conceptId: "concept_institutional_power", stage: "recognize" },
    { slot: "practice", kind: "practice", exerciseId: "perception_rejected" },
    { slot: "thread", kind: "thread", from: "concept_integration", to: "concept_institutional_power" }
  ],

  // ---------------------------------------------------------------------------
  // How each mastery stage is played, per concept.
  //   format "choice"  → pick one; graded against pack `answer`
  //   format "recall"  → think / type → reveal → self-assess
  //   format "teach"   → type → reveal "a strong answer includes" → self-assess
  //   format "action"  → FACT / STORY / ACTION (reflection)
  // `stem` (optional) is a short follow-up question under the pack prompt.
  levels: {
    concept_assimilation: {
      recognize: {
        format: "choice",
        options: [
          "The coworkers are mostly white.",
          "Adjusting speech in client meetings.",
          "Having a white partner.",
          "None of them, by itself."
        ],
        correct: 3
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: [
          "What must I become, suppress, or leave behind to belong?",
          "Who decides?",
          "Who is visible?",
          "What can we do together that we could not do separately?"
        ],
        correct: 0
      },
      apply: {
        format: "choice",
        options: ["Yes", "No", "Not enough evidence"],
        correct: 2
      },
      teach: {
        format: "teach",
        includes: [
          "Names the missing evidence: pressure toward dominant norms",
          "Or: suppressed identity, conditional belonging, redirected loyalty or resources",
          "Proximity alone establishes none of it"
        ]
      }
    },

    concept_integration: {
      recognize: {
        format: "choice",
        stem: "What changed?",
        options: ["Integration", "Ownership", "Institutional power"],
        correct: 0
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: ["Integration", "Institutional power", "Collective capacity", "Not enough evidence"],
        correct: 0
      },
      apply: {
        format: "choice",
        options: ["Yes — only integration", "No — it also shows institutional power", "Not enough evidence"],
        correct: 1
      },
      teach: {
        format: "teach",
        includes: [
          "Access to an institution or space",
          "That had excluded or restricted a group",
          "Stays on access — not power, not belonging"
        ]
      }
    },

    concept_representation: {
      recognize: {
        format: "choice",
        options: ["Representation", "Institutional power", "Ownership", "Not enough evidence"],
        correct: 0
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: ["Who decides?", "Can I enter?", "Who owns?", "Who benefits?"],
        correct: 0
      },
      apply: {
        format: "choice",
        options: ["Representation", "Institutional power", "Both"],
        correct: 0
      },
      teach: {
        format: "teach",
        includes: [
          "Presence can matter — access, symbolism, possibility",
          "Presence does not automatically transfer ownership or decisions",
          "Avoids treating it as everything or nothing"
        ]
      }
    },

    concept_institutional_power: {
      recognize: {
        format: "choice",
        options: ["Appearing in an ad", "Attending a meeting", "Controlling a budget", "Being praised"],
        correct: 2
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: ["Yes, clearly", "Limited at best", "Not enough evidence"],
        correct: 1
      },
      apply: {
        format: "choice",
        options: ["Institutional power", "Representation", "Integration", "Not enough evidence"],
        correct: 0
      },
      teach: {
        format: "teach",
        includes: [
          "Presence: who is in the room",
          "Power: who can make binding decisions",
          "Names what is decided — rules, money, leadership, assets"
        ]
      }
    },

    concept_collective_capacity: {
      recognize: {
        format: "choice",
        options: ["One millionaire", "A durable community legal fund", "A viral speech", "A celebrity endorsement"],
        correct: 1
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: [
          "What durable ability did the group gain?",
          "Who is visible?",
          "Can I enter?",
          "How widely was it celebrated?"
        ],
        correct: 0
      },
      apply: {
        format: "choice",
        options: ["Collective capacity", "Representation", "Assimilation", "Not enough evidence"],
        correct: 0
      },
      teach: {
        format: "teach",
        includes: [
          "Solidarity is a commitment or a relationship",
          "Capacity is a durable ability",
          "To coordinate resources, institutions, knowledge, and action"
        ]
      }
    },

    concept_organizing: {
      recognize: {
        format: "choice",
        options: [
          "50,000 views",
          "A one-day rally",
          "A membership group with roles and recurring meetings",
          "A slogan"
        ],
        correct: 2
      },
      recall: { format: "recall" },
      distinguish: { format: "recall" },
      apply: {
        format: "choice",
        options: ["Durable organizing structure", "More people", "A better slogan", "Media attention"],
        correct: 0
      },
      teach: {
        format: "teach",
        includes: [
          "Power can come from coordination rather than celebrity",
          "Names sources: numbers, resources, skills, votes, labor, information, institutions"
        ]
      }
    },

    concept_mutual_aid: {
      recognize: {
        format: "choice",
        options: ["Mutual aid", "Charity", "Representation", "Integration"],
        correct: 0
      },
      recall: { format: "recall" },
      distinguish: { format: "recall" },
      apply: {
        format: "choice",
        options: ["Yes — it is mutual aid", "Not necessarily; it is more clearly one-way aid", "Not enough evidence"],
        correct: 1
      },
      teach: {
        format: "teach",
        includes: [
          "Starts from repeated, reciprocal support",
          "Which can harden into funds, roles, rules, networks",
          "And, eventually, organizations"
        ]
      }
    },

    concept_right_view: {
      recognize: {
        format: "choice",
        options: ["Right Speech", "Right View", "Right Mindfulness", "Perception"],
        correct: 1
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: ["Right View", "Positive thinking"],
        correct: 0
      },
      apply: {
        format: "choice",
        reflection: true,
        options: [
          "Separate what is happening from the story, then look at causes",
          "Trust the anger — it already knows the answer",
          "Push the feeling down and move on",
          "Decide how to respond in kind"
        ],
        correct: 0
      },
      teach: {
        format: "teach",
        includes: [
          "What the problem is",
          "What is causing or feeding it",
          "That it can stop",
          "The path leading away from it"
        ]
      }
    },

    concept_right_speech: {
      recognize: {
        format: "choice",
        options: [
          "Lying, divisive speech, abusive speech, idle chatter",
          "Lying, gossip, complaining, silence",
          "Criticism, anger, disagreement, humor",
          "Lying, boasting, flattery, harshness"
        ],
        correct: 0
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: ["Yes — discomfort makes it wrong", "No"],
        correct: 1
      },
      apply: {
        format: "choice",
        options: ["Abusive, harmful use of speech", "Lying", "Idle chatter", "No concern — it is true"],
        correct: 0
      },
      teach: {
        format: "teach",
        includes: [
          "Truth is only one dimension",
          "Also abstains from divisive speech",
          "From abusive speech",
          "And from idle chatter"
        ]
      }
    },

    concept_perception: {
      recognize: {
        format: "choice",
        options: ["Will", "Perception", "Right View"],
        correct: 1
      },
      recall: { format: "recall" },
      distinguish: {
        format: "choice",
        options: ["An interpretation — a story", "A fact", "A description of the rule"],
        correct: 0
      },
      apply: {
        format: "action",
        fact: "The application was rejected.",
        story: "Nobody will ever hire me."
      },
      teach: {
        format: "teach",
        includes: [
          "Separates facts, interpretations, and controllable responses",
          "External rules, institutions, and harms stay real",
          "Self-mastery sits beside structural analysis, not in place of it"
        ]
      }
    }
  },

  // ---------------------------------------------------------------------------
  // SEE IT scenarios. Option ids that match the pack's `supported` tags are the
  // correct answers. `mode`: "single" answers on tap; "multi" needs Check.
  scenarios: {
    assimilation_s1: {
      mode: "multi",
      options: ["assimilation", "institutional_norms", "integration", "collective_capacity", "not_enough_evidence"],
      missing: "Whether refusing to change was a real option — and what it would have cost."
    },
    assimilation_s2: {
      mode: "single",
      stem: "",
      options: [
        { id: "yes", label: "Yes" },
        { id: "no_assim", label: "No" },
        "not_enough_evidence"
      ],
      missing: "Any pressure to conform, any distancing from Black institutions, where talent and resources flow."
    },
    assimilation_s3: {
      mode: "multi",
      options: [
        "who_sets_the_norm",
        "institutional_power",
        "assimilation_risk",
        { id: "headcount", label: "How many Black students are visible?" },
        { id: "entry", label: "Can Black students enroll?" }
      ],
      missing: "Whether the college's reason is neutral policy or preference for existing structures."
    },
    integration_s1: {
      mode: "single",
      options: ["integration", "representation", "institutional_power", "assimilation"],
      missing: "Whether new members gain any say in how the club is run."
    },
    integration_s2: {
      mode: "multi",
      options: ["integration", "institutional_power", "assimilation", "collective_capacity", "not_enough_evidence"],
      missing: "Who sits on the committees that set admissions, budget, and policy."
    },
    integration_s3: {
      mode: "single",
      options: [
        { id: "yes", label: "Yes — partnering means assimilating" },
        { id: "only_integration", label: "It is simply integration" },
        "not_enough_evidence"
      ],
      missing: "Whether the partnership changes the Black institution's norms, mission, or control over time."
    },
    representation_s1: {
      mode: "multi",
      options: ["representation", "institutional_power_gap", "institutional_power", "assimilation", "not_enough_evidence"],
      missing: "What authority the featured executives actually hold elsewhere."
    },
    representation_s2: {
      mode: "multi",
      options: ["representation", "ownership", "institutional_power", "assimilation", "not_enough_evidence"],
      missing: "How much the board's decisions bind the cooperative in practice."
    },
    representation_s3: {
      mode: "single",
      options: [
        { id: "representation", label: "No — it shows representation, not institutional change" },
        { id: "settled", label: "Yes — the problem is addressed" },
        { id: "power", label: "It shows the students now hold institutional power" }
      ],
      missing: "Whether the office has any authority over discipline policy."
    },
    power_s1: {
      mode: "multi",
      options: ["voice", "representation", "institutional_power", "collective_capacity", "not_enough_evidence"],
      missing: "Whether the director has ever followed the panel — and what happens when not."
    },
    power_s2: {
      mode: "multi",
      options: ["institutional_power", "democratic_governance", "integration", "mutual_aid", "not_enough_evidence"],
      missing: "Which decisions remain outside the workers' vote."
    },
    power_s3: {
      mode: "single",
      options: [
        "partial_power",
        { id: "broad_power", label: "Yes — broad institutional power" },
        { id: "no_power", label: "No authority at all" }
      ],
      missing: "How hiring decisions interact with the budget and rules set elsewhere."
    },
    capacity_s1: {
      mode: "single",
      options: [
        "possible_early_capacity",
        { id: "capacity_yes", label: "Yes — collective capacity" },
        { id: "nothing", label: "No — nothing was built" }
      ],
      missing: "Whether the fund, the relationships, or the process last beyond this one fire."
    },
    capacity_s2: {
      mode: "multi",
      options: ["collective_capacity", "institution_building", "representation", "assimilation", "not_enough_evidence"],
      missing: "Who governs the fund and the space, and how members hold them accountable."
    },
    capacity_s3: {
      mode: "single",
      options: [
        { id: "increased", label: "It increased" },
        { id: "decreased", label: "It decreased" },
        "not_enough_evidence"
      ],
      missing: "Any relationship between the wealth and institutions, funds, or networks the group controls."
    },
    organizing_s1: {
      mode: "multi",
      options: ["organizing", "collective_capacity", "representation", "mutual_aid", "not_enough_evidence"],
      missing: "How the association decides, and whether it lasts past this action."
    },
    organizing_s2: {
      mode: "single",
      options: [
        { id: "yes", label: "Yes — it trended" },
        { id: "proves_none", label: "It proves there is no organizing" },
        "not_enough_evidence"
      ],
      missing: "Membership, roles, meetings, a next action — any durable structure behind the attention."
    },
    organizing_s3: {
      mode: "multi",
      options: ["organizing", "coalition_like_coordination", "assimilation", "integration", "not_enough_evidence"],
      missing: "How the groups resolve disagreement and who speaks for the agenda."
    },
    mutual_s1: {
      mode: "single",
      options: ["mutual_aid", { id: "charity", label: "Charity" }, "representation", "integration"],
      missing: "How the group decides who receives help, and when."
    },
    mutual_s2: {
      mode: "single",
      options: ["charity_or_donation", "mutual_aid", "not_enough_evidence"],
      missing: "Nothing essential — the facts describe a one-way gift."
    },
    mutual_s3: {
      mode: "multi",
      options: ["institution_building", "collective_capacity", "representation", "assimilation", "not_enough_evidence"],
      missing: "Whether members still govern the credit union as it grows."
    },
    rightview_s1: {
      mode: "single",
      options: [
        { id: "notice_condition", label: "Notice the resentment, then look at what is feeding it" },
        { id: "retaliate", label: "Ignore them back" },
        { id: "suppress", label: "Tell yourself it does not matter" },
        { id: "conclude", label: "Decide they do not respect you" }
      ],
      missing: "What actually happened — and whether you know why."
    },
    rightview_s2: {
      mode: "single",
      options: [
        { id: "multiple_levels", label: "Both are real: an unfair rule and a fear worth examining" },
        { id: "only_rule", label: "It is only the rule" },
        { id: "only_mind", label: "It is only your mindset" },
        "not_enough_evidence"
      ],
      missing: "Who sets the rule, and what speaking up would actually risk."
    },
    rightview_s3: {
      mode: "single",
      options: [
        { id: "clear_seeing", label: "Clear seeing — telling inference from fact" },
        "right_speech",
        "organizing",
        "representation"
      ],
      missing: "The motive itself. You have only your certainty."
    },
    speech_s1: {
      mode: "single",
      options: [
        { id: "truthfulness_problem", label: "Truthfulness — repeating what you do not know" },
        { id: "idle", label: "Idle chatter" },
        { id: "abusive", label: "Abusive speech" },
        { id: "fine", label: "No problem — it helps your side" }
      ],
      missing: "Whether the rumor is true. You chose not to find out."
    },
    speech_s2: {
      mode: "single",
      options: [
        { id: "truthful_purposeful_speech_possible", label: "No — truthful, purposeful criticism is possible" },
        { id: "silence", label: "Yes — criticism breaks Right Speech" },
        { id: "consensus", label: "Only if everyone agrees with it" }
      ],
      missing: "Whether the criticism is also needlessly divisive — the facts suggest not."
    },
    speech_s3: {
      mode: "multi",
      options: ["right_speech_concern", "organizing_quality", "integration", "representation", "not_enough_evidence"],
      missing: "Whether anyone is steering the meeting back to the problem."
    },
    perception_s1: {
      mode: "single",
      stem: "Your proposal is rejected. Which is pure fact?",
      options: [
        { id: "A", label: "They hate me." },
        "B",
        { id: "C", label: "I'll never succeed." }
      ],
      missing: "Why it was rejected. That would need asking."
    },
    perception_s2: {
      mode: "single",
      options: [
        { id: "yes", label: "Yes" },
        "no",
        { id: "feelings", label: "Only if you are upset about it" }
      ],
      missing: "Nothing about the exclusion — it is documented. What remains open is the response."
    },
    perception_s3: {
      mode: "multi",
      options: ["perception", "right_view", "right_speech", "institutional_power", "representation"],
      missing: "What the other person meant. The practice works without knowing."
    }
  },

  // ---------------------------------------------------------------------------
  // PRACTICE exercises (app applications of the pack's self-path concepts).
  //   type "sort"   → place each line in a bin; optional ACTION follow-up
  //   type "speech" → which Right Speech concerns apply?
  //   type "level"  → where does this problem live?
  practice: {
    concept_perception: [
      {
        id: "perception_rejected",
        type: "sort",
        title: "Fact · Story · Action",
        situation: "Your proposal was rejected.",
        bins: ["FACT", "STORY"],
        items: [
          { text: "The proposal was rejected.", bin: "FACT" },
          { text: "Nobody respects me.", bin: "STORY" },
          { text: "The email gave no reason.", bin: "FACT" },
          { text: "They never wanted me here.", bin: "STORY" }
        ],
        action: {
          prompt: "ACTION — what is available to you?",
          options: ["Ask for feedback.", "Revise.", "Apply elsewhere.", "Choose another response."]
        },
        note: "The fact stays. The story is optional. The action is yours."
      },
      {
        id: "perception_policy",
        type: "sort",
        title: "Fact · Story · Action",
        situation: "A workplace policy excludes part-time staff — including you — from training funds.",
        bins: ["FACT", "STORY"],
        items: [
          { text: "The policy excludes part-time staff from training funds.", bin: "FACT" },
          { text: "This will never change.", bin: "STORY" },
          { text: "I was not included in this year's training.", bin: "FACT" },
          { text: "I'm not good enough to be here.", bin: "STORY" }
        ],
        action: {
          prompt: "ACTION — what is available to you?",
          options: [
            "Find out who set the policy and how it changes.",
            "Talk with others it affects.",
            "Find training elsewhere in the meantime."
          ]
        },
        note: "The rule is a real external condition. The prediction is a story. Both can be true at once."
      },
      {
        id: "perception_interrupted",
        type: "sort",
        title: "Fact · Story · Action",
        situation: "A colleague interrupted you twice in a meeting.",
        bins: ["FACT", "STORY"],
        items: [
          { text: "I was interrupted twice.", bin: "FACT" },
          { text: "She thinks I'm stupid.", bin: "STORY" },
          { text: "I did not finish my point.", bin: "FACT" },
          { text: "She did it on purpose.", bin: "STORY" }
        ],
        action: {
          prompt: "ACTION — what is available to you?",
          options: ["Finish the point in writing.", "Ask for the floor next time.", "Talk with her directly.", "Let it go."]
        },
        note: "Motive is a guess until there is evidence for it."
      },
      {
        id: "perception_rent",
        type: "sort",
        title: "Fact · Story · Action",
        situation: "Your landlord raised the rent 18%.",
        bins: ["FACT", "STORY"],
        items: [
          { text: "The rent increased 18%.", bin: "FACT" },
          { text: "I have no options.", bin: "STORY" },
          { text: "Two neighbors got the same notice.", bin: "FACT" },
          { text: "Nobody will help.", bin: "STORY" }
        ],
        action: {
          prompt: "ACTION — what is available to you?",
          options: ["Check local rent rules.", "Talk with the neighbors who got the notice.", "Ask for a payment plan."]
        },
        note: "A shared condition can become a shared response."
      }
    ],

    concept_right_view: [
      {
        id: "rightview_manager",
        type: "sort",
        title: "Right View",
        situation: "You have felt anxious all week about a conflict with your manager.",
        bins: ["THE PROBLEM", "WHAT FEEDS IT", "ITS STOPPING", "THE PATH"],
        items: [
          { text: "Tightness in the chest every morning", bin: "THE PROBLEM" },
          { text: "Replaying the argument, over and over", bin: "WHAT FEEDS IT" },
          { text: "Walking in without dread", bin: "ITS STOPPING" },
          { text: "Name the issue and ask for a direct conversation", bin: "THE PATH" }
        ],
        note: "SN 45.8: knowledge of stress, its origination, its stopping, and the path. This mapping is an app application, not the sutta's words."
      },
      {
        id: "rightview_silence",
        type: "sort",
        title: "Observation · Interpretation",
        situation: "A friend has not replied to your messages in four days.",
        bins: ["OBSERVATION", "INTERPRETATION"],
        items: [
          { text: "No reply in four days.", bin: "OBSERVATION" },
          { text: "She's angry with me.", bin: "INTERPRETATION" },
          { text: "I checked my phone twenty times today.", bin: "OBSERVATION" },
          { text: "I've been replaced.", bin: "INTERPRETATION" }
        ],
        action: {
          prompt: "What might lead away from the problem?",
          options: ["Ask, plainly.", "Wait without filling the silence with stories.", "Notice what the checking feeds."]
        },
        note: "Seeing clearly starts with knowing which parts you actually observed."
      },
      {
        id: "rightview_team",
        type: "sort",
        title: "Right View",
        situation: "Your team keeps missing deadlines, and you feel resentful toward everyone on it.",
        bins: ["THE PROBLEM", "WHAT FEEDS IT", "ITS STOPPING", "THE PATH"],
        items: [
          { text: "Resentment and exhaustion", bin: "THE PROBLEM" },
          { text: "No one owns the schedule, and I silently cover the gaps", bin: "WHAT FEEDS IT" },
          { text: "Work that is shared, not carried alone", bin: "ITS STOPPING" },
          { text: "Propose a clear owner for deadlines; stop covering silently", bin: "THE PATH" }
        ],
        note: "The conditions here are both structural (no owner) and personal (silent covering). Right View looks at both."
      },
      {
        id: "level_lending",
        type: "level",
        title: "Where does it live?",
        situation: "A bank's written lending rules require collateral most applicants in a neighborhood do not have. Applying, you feel ashamed.",
        correct: ["institutional", "self"],
        note: "Mixed. The rule is institutional. The shame is internal. Neither cancels the other."
      },
      {
        id: "level_roommates",
        type: "level",
        title: "Where does it live?",
        situation: "Two roommates argue for weeks about who does the dishes.",
        correct: ["interpersonal"],
        note: "Not every conflict is structural. This one lives between two people."
      },
      {
        id: "level_meetings",
        type: "level",
        title: "Where does it live?",
        situation: "You stay silent in meetings because you fear sounding foolish. No rule or person stops you.",
        correct: ["self"],
        note: "Nothing external is described. The obstacle is internal — which also means it is workable."
      },
      {
        id: "level_redlining",
        type: "level",
        title: "Where does it live?",
        situation: "A neighborhood that was redlined decades ago still receives less lending and investment than its neighbors.",
        correct: ["historical", "structural"],
        note: "A past policy shaping present conditions. Personal mindset is not the level at issue."
      }
    ],

    concept_right_speech: [
      {
        id: "speech_trust",
        type: "speech",
        title: "Before you speak",
        situation: "To a coworker, about another coworker. You have no evidence.",
        quote: "Don't trust Maya. She only looks out for herself.",
        correct: ["divisive"],
        acceptable: ["lying"],
        note: "Unsupported and splitting people apart: divisive speech, edging toward untruth."
      },
      {
        id: "speech_data",
        type: "speech",
        title: "Before you speak",
        situation: "In a meeting, with the numbers in hand.",
        quote: "Our hiring process screens out applicants from these three zip codes. I think we should change it.",
        correct: ["none"],
        note: "Uncomfortable, truthful, and purposeful. Right Speech does not require silence."
      },
      {
        id: "speech_clueless",
        type: "speech",
        title: "Before you speak",
        situation: "Angry, in front of the team.",
        quote: "You're an embarrassment. Everyone here can see how clueless you are.",
        correct: ["abusive"],
        acceptable: ["divisive"],
        note: "Even a legitimate disagreement is undermined by humiliation."
      },
      {
        id: "speech_game",
        type: "speech",
        title: "Before you speak",
        situation: "An hour into an urgent meeting about a neighbor's eviction.",
        quote: "Did anyone see the game last weekend? So the fourth quarter —",
        correct: ["idle"],
        note: "Harmless elsewhere. Here it spends time the problem needs."
      },
      {
        id: "speech_approved",
        type: "speech",
        title: "Before you speak",
        situation: "You have not checked. You say it to end the argument.",
        quote: "The city already approved the plan.",
        correct: ["lying"],
        note: "Stating as fact what you do not know is a truthfulness problem."
      },
      {
        id: "speech_budget",
        type: "speech",
        title: "Before you speak",
        situation: "Privately, calmly, to a friend about their event plan.",
        quote: "I think the budget is short by about $2,000. Here's where.",
        correct: ["none"],
        note: "Truthful, specific, useful. Criticism can be Right Speech."
      }
    ]
  },

  speechOptions: [
    { id: "lying", label: "Lying" },
    { id: "divisive", label: "Divisive speech" },
    { id: "abusive", label: "Abusive speech" },
    { id: "idle", label: "Idle chatter" },
    { id: "none", label: "None — it can be said" }
  ],

  levelOptions: [
    { id: "self", label: "Self" },
    { id: "interpersonal", label: "Interpersonal" },
    { id: "institutional", label: "Institutional" },
    { id: "structural", label: "Structural" },
    { id: "historical", label: "Historical" }
  ],

  // ---------------------------------------------------------------------------
  // WHAT NOW? boss cases. Steps follow the pack's order. Structured steps are
  // compared with the pack's `expected` answers but never scored.
  bosses: {
    boss_talent: {
      used: [
        "concept_integration",
        "concept_representation",
        "concept_institutional_power",
        "concept_collective_capacity",
        "concept_assimilation"
      ],
      unresolved: "Where does individual success become durable collective capacity?",
      steps: {
        SEE: {
          format: "sort",
          bins: ["SUPPORTED", "POSSIBLE", "NEEDS EVIDENCE"],
          items: [
            { text: "Integration", bin: "SUPPORTED" },
            { text: "Representation", bin: "SUPPORTED" },
            { text: "Individual advancement", bin: "SUPPORTED" },
            { text: "Assimilation", bin: "POSSIBLE" },
            { text: "Institutional power", bin: "NEEDS EVIDENCE" },
            { text: "Collective capacity", bin: "NEEDS EVIDENCE" }
          ]
        },
        EVIDENCE: {
          format: "multi",
          options: [
            { label: "Pressure to conform", strong: true },
            { label: "The terms of her belonging", strong: true },
            { label: "Distancing from Black identity or institutions", strong: true },
            { label: "Where her skills and resources flow", strong: true },
            { label: "The company's demographics", strong: false },
            { label: "Her neighborhood", strong: false }
          ]
        },
        POWER: { format: "open" },
        SELF: { format: "open" },
        "WHAT NOW?": {
          format: "open",
          directions: [
            "Specific: names an institution, a fund, a role, a pipeline.",
            "Honest about the tradeoff: time, risk, influence, belonging.",
            "Built on evidence, not on a verdict about her."
          ]
        }
      }
    },
    boss_meeting: {
      used: [
        "concept_representation",
        "concept_institutional_power",
        "concept_mutual_aid",
        "concept_collective_capacity",
        "concept_organizing",
        "concept_right_speech",
        "concept_perception"
      ],
      unresolved: "How does a room full of voices become a body that decides?",
      steps: {
        SEE: {
          format: "choice",
          options: [
            "Representation — they are present and heard",
            "Institutional power — they decide",
            "Both, equally"
          ],
          model: 0
        },
        LINEAGE: {
          format: "choice",
          options: ["Mutual aid", "Charity", "Representation", "Integration"],
          model: 0
        },
        POWER: { format: "open" },
        SELF: {
          format: "choice",
          options: ["Right Speech", "Integration", "Representation", "Ownership"],
          model: 0
        },
        PERCEPTION: {
          format: "sort",
          bins: ["FACT", "STORY"],
          items: [
            { text: "Final budget and contracts are controlled elsewhere.", bin: "FACT" },
            { text: "The officials don't care about us.", bin: "STORY" },
            { text: "The meeting became angry and personal.", bin: "FACT" },
            { text: "Nothing we do will matter.", bin: "STORY" }
          ]
        },
        "WHAT NOW?": {
          format: "open",
          directions: [
            "Structurally precise: aims at where the budget and contracts are decided.",
            "Practical: a next step residents can actually take.",
            "Aware of the tradeoff: time, cost, who carries the work."
          ]
        }
      }
    }
  }
};
