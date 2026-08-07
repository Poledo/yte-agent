# INDEX — Cây tài liệu Robot Mascot

Trạng thái: ✅ có nội dung thật · 📝 mục lục/scaffold · ⬜ để trống (điền sau).

```
docs/
├── README.md ✅
├── INDEX.md ✅
├── CHANGELOG.md ✅
├── 00_Project/            ⬜ Vision, Goals, Scope, Roadmap, Risk...
├── 01_GameDesignDocument/ ⬜ CompanionSystem, EmotionSystem, RobotInteraction...
├── 02_RobotDesign/        📝 RobotDesignDocument ✅ · Expressions ✅ · (Appearance, IdleBehavior... ⬜)
├── 03_AnimationBible/     ✅ AnimationBible, AnimationPriority, MouseTracking · (BlendTree... ⬜)
├── 04_AIBehavior/         ✅ StateMachine, BehaviourTree, EmotionEngine, IdleDirector · (MemorySystem... ⬜)
├── 05_Interaction/        ✅ InteractionBible, ValidationReaction, PopupInteraction · (DragDrop... ⬜)
├── 06_UX/                 📝 ColorPalette ✅ · (Motion, Typography... ⬜)
├── 07_UI/                 ⬜ PopupDesign, ChatPanel, RobotPanel...
├── 08_ThreeJS/            ⬜ (v2 — v1 chỉ SVG/CSS, không dùng ThreeJS)
├── 09_Assets/             ⬜ AssetBible, Expressions, LogoUsage...
├── 10_Sound/              ⬜ (SoundController hoãn sang v2)
├── 11_Architecture/       ✅ Architecture (module map) · (APIContracts... ⬜)
├── 12_Development/        ⬜ CodingGuideline, DefinitionOfDone...
├── 13_LifeSystem/         ✅ LivingWorld, PopupHome, WaitEscalation, ExtensibilityGuide (RDD v2 — vòng 2 đã wire vào code)
├── 13_Testing/            ⬜ TestPlan, AnimationTesting...
├── 14_Deployment/         ⬜ CI-CD, ReleaseChecklist...
├── 15_RobotBrain/         ✅ ReactionPriority, MouseTrackingModel, EmotionTransition, SleepSystem · (còn lại ⬜)
├── diagrams/              ⬜ *.drawio (RobotFSM, BehaviourTree, EmotionEngine...)
├── prompts/               ⬜ RobotDesigner, Animator, Reviewer...
└── references/            ⬜ Research, MotionReferences, MedicalUXReferences...
```

## Nguyên tắc điền tiếp

1. Ưu tiên viết file khi **đang code phần đó** — tài liệu bám code, không viết trước xa.
2. Mỗi file nên trỏ tới file mã nguồn tương ứng để dễ đối chiếu.
3. Không xoá lịch sử: bổ sung vào [CHANGELOG.md](CHANGELOG.md).
