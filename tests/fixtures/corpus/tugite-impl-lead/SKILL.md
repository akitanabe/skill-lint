---
name: impl-lead
description: >-
  明示起動時だけ、親が一つ以上の Implementation Unit を正規化し、direct または各単位の worker を選び、
  必要な場合だけ risk-directed review を選び、必須の final writing gate、TDD と親 QA を経て accept または stop-incomplete で安全に閉じる実装 loop。
---
<!-- Generated from shared/. Do not edit directly. -->

# Active main

この skill はユーザーが明示的に起動した場合だけ開始する。自然言語の作業内容、規模、現在の
context から暗黙に起動しない。起動後も、親が受け入れ判断と最終報告を保持する。単一 Implementation Unit の direct または
一名 worker という既存経路は保ちつつ、同じ run で複数単位を安全に処理できる。
`risk-directed review` は固定 phase や全作業の必須手順ではなく、親が具体的な risk と判断への影響を説明できる場合だけ実行する。
これは run を閉じる直前の必須 `final writing gate` とは別責務である。

## Intake and Implementation Unit normalization

親は実装を始める前の初期 Intake で、要求全体、対象 repository、現在の dirty state、基準状態を観測する。Issue、doc、
plan section、ユーザーの箇条書き、freeze 済み設計などの source boundary を Implementation Unit boundary とみなさず、対象 file と
その周辺、呼び出し元・先、関連 test を読んでから、意味上区別できる到達結果を recall 寄りに成果候補として一度観測する。
1 source から複数、複数 source から一つ、1 source から一つの成果と Implementation Unit をいずれも許容し、対応数を固定しない。

成果候補は semantic end-state についての transient observation である。統合できそうという理由で早期に候補を落とさない一方、
file 編集、generator、version 更新、verification command などの実装手段・工程は、それ自体が要求成果でない限り候補にしない。
新しい Data model、schema、必須 ID、Implementation Unit Data field、固定 input field、provenance field、永続 artifact を導入しない。

親は coverage を二段階で確認する。成果候補の抽出時には要求全体から意味上の到達結果を取りこぼしていないか確認し、
Implementation Unit 確定時には全要求が最終集合へ反映されているか確認する。成果要求は原則としてちょうど一つの Implementation Unit を primary
owner とし、横断 constraint / invariant は複数単位へ適用でき、non-goal / 今回除外は owner を持たず理由または境界判断を明示する。
未割当要求を残したまま dispatch しない。

親は成果候補と coverage から run の目的を一つ以上の Implementation Unit に正規化する。複数であることだけを停止理由にしない。
Implementation Unit Data の意味と field の唯一の正本はこの section である。各単位は次の Data を持つ。

- `id`: run 内で一意な識別子。
- `purpose`: 単一の目的。
- `acceptance_criteria`: 外部から観測可能で検証可能な Acceptance Criteria。これは候補条件であり、accept の確定ではない。
- `scope`: `change`（変更を許す範囲）と `exclude`（変更しない範囲）。
- `implementation_freedom`: worker に任せてよい局所判断。なければ空。
- `constraints`: ユーザー指定、互換性、依存、実行環境その他の制約。
- `depends_on`: Implementation Unit ID 間の semantic dependency と、外部・repository・environment の precondition を分けた記述。同じ file、writer、generated output、generator、contract registry、Gunte gate、verification surface の共有だけでは semantic dependency または Implementation Unit 統合の根拠にならず、execution conflict として扱う。
- `verification`: AC ごとの native test、focused test、必要な最終 gate。

Implementation Unit Data は上記 canonical field だけを表す。

Implementation Unit は、単一 purpose、観測可能な完結成果、単独で Green になる検証、無関係な変更なしに accept / revert できる
変更集合（後続依存の cascade rollback は許す）、独立した副作用と rollback 境界を持つ。

単一 Implementation Unit として正規化する場合も、内部に独立して Green / accept できる複数成果、独立 AC / verification / rollback
boundary、foundation / application の別成果が残っていないか親が自己再検査する。分割しない理由の専用 field、固定 ledger、
常時の外部説明は要求しない。

不足、矛盾、または scope を閉じられない状態が品質に影響する場合、推測で補わず必要な情報を親へ戻すか、理由・
未完了範囲・evidence・残存 risk を含む `stop-incomplete` とする。要求と repository の状態を観測せずに worker を
起動しない。既存の dirty/untracked は scope に含めず、勝手に変更・削除しない。

worker、base、route、order、isolation、result は実行時の execution data として親が記録し、Implementation Unit の
意味を書き換えない。review goal、reviewer handoff、finding、QA result、persistence resource も Implementation Unit の意味ではなく
execution data として扱う。

### Mandatory implementation-unit-design boundary

Implementation Unit を形成または再形成するとき、親は single / trivial を理由に `implementation-unit-design` を bypass しない。親が選定した non-empty normalization target を、候補数や自明性によらず一度 `implementation-unit-design` へ渡す。normalization target が空のときは起動しない。

親は current Implementation Unit / candidate、未処理 obligation、意味変更 / drift / grouping evidence などの既存 context から関連 normalization target を組む。raw request から新しい候補抽出 phase を作らない。成果候補ごとに個別起動しない。返された `implementation_units`、分割／統合 signal、`blocking_gaps` は候補である。

返却後にだけ、親は成果候補が暗黙に消えていないこと、要求 coverage、要求されていない新成果がないこと、unresolved `blocking_gaps` がないこと、Implementation Unit Data と execution data の境界、候補の採否と ID を run-wide responsibility として確定する。fresh ID / context と dependency edge は、この再確認の後にだけ確定する。`impl-lead` は RMO path / loader / Method mapping を持たない。

この boundary では、親は候補群と grounding に加えて、invocation 固有の確認順序と attention priority を
`partition_perspectives` として渡せる。これは答えを先付けするものではなく、次の観点を必要な順序で照らすための
transient execution Data である。
親は `partition_perspectives` として semantic outcome / purpose、independent AC / focused verification、accept / rollback boundary、semantic dependency、execution conflict / order / isolation、run-wide final gate を渡せる。

- `semantic outcome / purpose`: 各候補が生む外部から観測可能な outcome と単一 purpose。
- `independent AC / focused verification`: 候補ごとに独立して Green と検証ができる AC と focused verification。
- `accept / rollback boundary`: 候補単位で accept または rollback できる境界。
- `semantic dependency`: 候補間で意味上必要な dependency と、その理由。
- `execution conflict / order / isolation`: shared file、writer、generated output、generator、contract registry、Gunte gate、
  verification surface の共有を semantic dependency や merge の根拠にせず、execution conflict として order / isolation とともに扱う。
- `run-wide final gate`: full / run-wide gate は focused verification の代替ではなく、候補確定後の最終 gate として扱う。

この mapping は候補数、split point、merge 対象を指定せず、固定 mode、threshold、expected-output oracle、ledger も導入しない。
`implementation-unit-design` の返却後は、候補の採否、全要求の coverage、未要求成果、`blocking_gaps`、Implementation Unit Data と execution Data の
境界を親が再確認し、実装・委譲・accept の判断を引き取る。

runtime が Skill 間起動を提供しない場合は、親が `implementation-unit-design` 本文を同じ Intake／再正規化工程として直接参照する。
親が候補を採用・差し戻し・stop-incomplete とする判断と、実装・委譲の実行責務は変わらない。

実行中の再正規化では新しい成果候補抽出 phase を追加しない。既存の統合、追加分割、部分成果の独立再構成、semantic dependency
edge の再接続を維持する。

unit を形成または再形成する次の入口は、上記 mandatory boundary へ接続する。

- `dependency-dispatch-guard` が `blocked` を返した後、親が再正規化を選ぶ場合
- `implementation-unit-continuation-routing` が `renormalization-required` を返した場合
- protected dirty / base drift の後、親が再正規化を選ぶ場合
- worker-tier 選択前に AC / 責任境界 / dependency の再設計が必要な場合
- non-empty selected remediation grouping
- grouping-relevant evidence が material に変化した regrouping
- risk finding 競合の解消として再正規化を選ぶ場合

次は再正規化入口にしない。

- same-context 限定修正（`same-context-continuation`）
- zero findings
- grouping-relevant evidence が不変な場合
- promoted obligation の再入力
- 親が再正規化ではなく確認または `stop-incomplete` を選ぶ route

空 invocation、固定回数、recursive loop を追加しない。

## High-level lifecycle invariants

route、worker/reviewer 選択、親 QA、finding 採否、accept/stop-incomplete、persistence の要否と条件は、常に親が判断と
最終責任を保持する。各手順の詳細な procedure と Loader Data は下記の reference が正本を持ち、親は次の pre-screen と
Reference routing を通じてだけそれらを読み込む。

## Review minimal pre-screen

自己検証は不確実性を減らすが、独立レビューの代替にはならない。

親は、自己検証の結果だけを理由に独立 review の価値を消去せず、独立した観点による追加の反証機会の価値を
自己検証とは別に評価する。reviewer を選ばない判断も、自己検証が Green であること自体ではなく、追加の反証機会が
親の判断を変えうるかの評価に基づける。

親が AC、diff、test、外部副作用、責任境界などから具体的な risk と、その review 結果が修正・`accept`・`stop-incomplete`
の判断をどう変えうるかを説明できない場合、risk-review candidate は形成しない。candidate が形成された場合は、最終
reviewer 選択・non-selection・handoff の前に `references/risk-review.md` を読み、その正本に従って選択する。
candidate がなければ reference も reviewer も起動しない。

## Parallel minimal pre-screen

候補間に残存する semantic dependency、既知の競合、または適用順で結果が変わる関係がある collection は並列候補として
形成しない。候補が形成された場合は、最終 eligibility 確定の前に `references/parallel-execution.md` を読み込む。候補が
なければ読み込まない。

## Reference routing

各 reference は独立した procedure の正本である。親は trigger が成立した reference だけを読み、そこにある Flow / Loader
Data を唯一の正本として扱う。

```text
trigger = dependency/precondition、base snapshot/isolation、direct route の実行順、continuation routing の判断に至ったとき
path = references/execution.md
expected identity = impl-lead execution v1
failure = stop-incomplete
```

```text
trigger = 委譲 route を選び、worker tier、fresh handoff、writable scope、worker silence policy の判断に至ったとき
path = references/delegation.md
expected identity = impl-lead delegation v1
failure = stop-incomplete
```

```text
trigger = 上記 Parallel minimal pre-screen を通過した並列候補が形成されたとき
path = references/parallel-execution.md
expected identity = impl-lead parallel execution v1
failure = stop-incomplete
```

```text
trigger = worker/direct の結果を受け取り、親 QA（Red 観測含む）または run を閉じる前の closeout-前 QA を行うとき
path = references/parent-qa.md
expected identity = impl-lead parent QA v1
failure = stop-incomplete
```

```text
trigger = 上記 Review minimal pre-screen を通過した risk-review candidate が形成されたとき
path = references/risk-review.md
expected identity = impl-lead risk review v1
failure = stop-incomplete
```

```text
trigger = 外部副作用を伴う Action の状態管理・retry・conditional persistence の operation が必要になったとき
path = references/external-effects.md
expected identity = impl-lead external effects v1
failure = stop-incomplete
```

```text
trigger = run-owned checkout の作成または closeout の判定に到達したとき
path = references/run-owned-lifecycle.md
expected identity = impl-lead run-owned lifecycle v1
failure = stop-incomplete
```

```text
trigger = 全 Implementation Unit が accept 候補で run accept 直前に到達したとき（必須、pre-screen なし）
path = references/final-writing-gate.md
expected identity = impl-lead final writing gate v1
failure = stop-incomplete
```

## Execution data and conditional persistence

Implementation Unit、plan、finding、QA 結果は会話内 execution data を既定とする。ユーザー要求、後日再開、別 session / 別担当への
handoff、外部 review、PR、監査、tool / repository 運用によって現在 context より長く生存する必要がある場合だけ、必要な data を
一般化した persistence resource へ保存する。complexity、file 数、Implementation Unit 数を固定 threshold にしない。

保存の operation 詳細（filesystem / repository / PR / Issue / API の確認事項）は `references/external-effects.md` に従う。
ユーザー所有 resource を無断で上書きまたは削除せず、必須の永続化を安全に実行・照合できなければ確認または
`stop-incomplete` とする。artifact が存在すること自体を quality evidence にしない。

## Final report quality signals

最終報告は run の品質シグナルを短く示す。以下の policy Data は要約の意味を固定する正本であり、report output schema、固定 format、新しい Data model、永続 artifact を導入するものではない。

```text
signal_policy = "bounded final-report quality signals"
run_verdict = "accept | stop-incomplete"
implementation_unit_signal = "identity + short summary + implementation owner + scoped optional risk-directed reviewer + viewpoint + distinguishable verification result"
reviewer_absence = "none is explicit"
verification_result = "a result Human can distinguish as passed, failed, not run, or unverified"
final_writing_gate = "mandatory run-wide; separate from optional risk-directed review; report execution fact and scope"
pre_gate_stop = "stop-incomplete before gate => gate not run"
conditional_concern = "notable decision / unresolved concern only when present; short; no ledger or fixed decision table"
default_push = "commands, finding adjudication, base, isolation, dependency are not pushed"
conversation_pull = "same-run observed and recorded conversation execution data only"
historical_reconstruction = "do not claim retrieval or reconstruction of past state"
responsibility_invariance = "route, worker/reviewer selection, review responsibility, accept/stop-incomplete, persistence responsibility and conditions unchanged"
```

この policy Data を満たす範囲で、説明の文言、並び、表示方法は柔軟にできる。Data にない詳細な command、全 finding の裁定、base / isolation / dependency は必要時だけ同じ run の既存 conversation execution data から Pull し、過去状態を再取得・再構成できるとは主張しない。Data の意味に反する decoy や責務の逸脱は、親の semantic QA で裁定する。route、worker / reviewer 選択、review 責務、accept / stop-incomplete、persistence の責務・判断条件は変更しない。
