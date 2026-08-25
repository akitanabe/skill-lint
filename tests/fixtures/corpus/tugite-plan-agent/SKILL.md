---
name: plan-agent
description: >-
  ユーザーが明示した場合だけ、Human が途中経過を追わず Agent に任せる「おまかせ」workflow として、
  recommendation-first の自由形式の計画・設計成果物を起草する。gate pass 後は review 適用対象を bounded に確認し、
  圧縮した結果と推奨候補を返す。public workflow parent が内部工程として `final-candidate` / `incomplete` と圧縮出力を裁定し、
  Human が最終成果物を採用して後続 Action を許可する。実装・委譲・次工程の自動前進は行わない。
---
<!-- Generated from shared/. Do not edit directly. -->

# plan-agent

この Skill は、依頼に応じた自由形式の計画・設計成果物を起草し、親へ確定候補を返す。成果物は設計判断書、
改修方針、移行計画、比較検討、作業メモ、リスク整理、実装単位の候補案などでよく、特定の実行 schema や
固定された後続工程の入力へ変換しない。規範本文はこの Skill 自身で完結し、別の実装 workflow の本文を前提にしない。

通常の `plan-agent` は、Human が途中経過を追わず Agent に任せる「おまかせ」workflow である。Agent が要求と
repository の evidence を調査し、推奨できる計画を理由付きでまとめ、Human には圧縮した結果だけを返す
recommendation-first を既定とする。Human の途中承認や逐次確認を既定の工程にしない。

推奨の判断は、要求原文・repository evidence・scope・constraints・verification・risk と、親から注入された共有判定基準を同じ
判定基準へ揃えて行う。十分な根拠があれば Agent が方針を選び、選んだ理由と棄却した代替案を残す。要求は解釈するが
書き換えない。ユーザー要求、明示制約、観測事実は覆さず、既存の Agent の判断、過去の plan、review の結論は
authority/freeze とせず、現在の evidence で再評価する。例外は、要求同士または要求と明示制約の不可約な意味衝突だけであり、
その場合だけ Human escalation として必要な一点を返す。`plan-interactive` の direction freeze / final acceptance は
この通常 workflow へ持ち込まず、その public workflow の境界を変更しない。

reviewer の `人間確認` は reviewer が観測した signal に留まり、採否・停止・推奨を決めない。public workflow parent が内部工程として `final-candidate` / `incomplete` と圧縮出力を裁定し、Human が最終成果物の採用と後続 Action を許可する。

### semantic completion eligibility Calculation

artifact 保存前の semantic completion eligibility は、不可約な意味衝突、blocking evidence 不足、structural budget 等で
安全継続不可、workflow/context 不成立、現 candidate を推奨不能な状態、blocking finding、未反映修正必須、要求意味変更、
または evidence 不足のいずれもなく、現在の candidate を推奨できる場合だけ成立する。単なる複数案、別案、軽い不確実性だけでは
`stop-incomplete` にせず、Agent が比較して一案を推奨し、残る不確実性を risk または Human Attention へ記録する。

outward candidate status は次の Calculation で一度だけ決める。semantic completion eligibility と後述の保存結果を入力とし、
両方が成功した場合だけ `final-candidate`、それ以外は `incomplete` とする。semantic 判定と保存後で status を二度確定しない。

## おまかせ workflow の review と推奨判定

review の `termination` は review-refine がどのように終了したかを示す process Data であり、`final-candidate` / `incomplete`
という計画の判定とは別軸である。criticism exhaustion、round-limit、残存 finding は process Data として保持し、candidate status は
上記 Calculation の結果を参照する。

review を続ける価値の判断が難しい場合だけ、read-only `plan-quality-advisor` を起動できる。毎 round 起動せず、advisor には request、repository_observation、review_goal、current snapshot、finding ledger、直近差分、verification、residual risk を Data として渡す。advisor は追加 round の期待利益、
残存 finding、churn/限界効用、不足 evidence を非拘束 insight として返す。advisor は candidate を修正せず、parent が
continue / stop-and-finalize / stop-incomplete を裁定する。

semantic completion eligibility が成立した場合、bounded stop 後の残存 finding が成果物自体の residual risk または scope 外事項に
実質的な影響を持つときだけ、成果物本文の内容として反映する。Human の最終判断が必要な事項は stdout の Human Attention に絞る。
解消済み、却下済み、軽微な文言、disposition、churn の履歴は成果物または stdout へ残さない。

## おまかせ workflow の圧縮出力

`final-candidate` の既定出力は Result / 短い Summary / 必要な場合だけの Human Attention / Artifact local path とする。
final summary は明示 opt-out できる。review skip と final summary skip は独立であり、一方を指定しても他方を暗黙に変更しない。
`final-candidate` の summary opt-out は Artifact だけを返す。ただし `incomplete` の summary opt-out では `Result: incomplete`、
Blocking Reason、Residual Risk を必ず返し、必要な場合だけ Human Attention を示す。途中の decision / review 全履歴を Human に
要求しない。詳細な artifact と stdout の境界は後述の completion contract に従う。

`return target` は public workflow parent が所有する。現在の plan-agent は gate の assessment を受けて plan-candidate-producer へ
返すか後段へ進むかを親として判断し、明示されていない別 workflow へ自動 switch しない。

## 発火制御と責務

- ユーザーが `plan-agent` の起動または同等の明示要求をした場合だけ起動する。自然言語の作業内容や context から暗黙に起動しない。
- 各 platform の invocation metadata は上記の explicit-only 契約を表し、その範囲を拡張しない。
- 起動しても実装、テスト作成、委譲、Worker 起動、worktree 操作、実装開始、次工程の自動前進を行わない。
- `review` の実行、local artifact の安全な保存、`final-candidate` / `incomplete` と圧縮出力の内部裁定までを担う。最終成果物の採用と後続 Action の許可は Human が判断する。

## proposal resolution の caller ownership

plan-candidate-producer の invocation boundary、discretionary authority、resolution execution bound は `plan-agent` が所有する。
internal `plan-candidate-producer` の開始時に、caller=`plan-agent`、resolver=planner、counterpart=`plan-quality-advisor`（Resolution
Transaction 外の one-shot observation）を mapping し、`authority = discretionary`、`authority_constraints = []` を注入する。
plan-agent は caller mapping、authority injection、resolution execution bound、`producer-invocation-preflight` の invocation boundary、および `plan-artifact-design` の parent-owned load を所有する。kernel / `producer-invocation-preflight` の load / identity / required section / failure routing は owner である plan-candidate-producer に委ね、この Skill では再定義しない。advisor は非拘束 Data を返し、planner が一次情報を
基準に既存 adoption ledger へ裁定する。advisor invocation point は `advisor-two-pass-orchestration` Flow に委譲し、この Skill は
invocation point だけを保持する。

ユーザーが安全上限を指定していない場合、親は plan-candidate-producer loop の開始時に resolution execution bound を internal responsibility
として決定し、loop 中は固定する。固定数、新しい public parameter / schema、`resolve_rounds` は追加しない。この bound は
structural gate budget および review-refine budget と別 Data とし、相互に加算・流用しない。

## Programmatic Flows

以下は、親が意味判断を完了して確定 Data を渡した後の局所的な deterministic routing だけを持つ。
Flow の procedure、条件、outcome は固定であり、Agent は override、bypass、置換しない。outcome 後に複数の妥当な Action が残る意味判断は Agentic な親へ返す。

### candidate-structural-gate-routing

Trigger: 親が producer status / candidate snapshot、gate assessment、独立した structural gate budget を確定したとき。
Inputs: producer status、verified candidate snapshot、gate assessment、`rounds.limit`、親確定の `current round`、gate evidence、producer と gate の親確定 context。
Procedure: producer `stop-incomplete`、context-not-established、insufficient-evidence、invalid budget は `stop-incomplete` とする。gate pass は downstream へ進める。gate return は current round が parent-fixed limit 未満の場合だけ、gate evidence を入力に producer retry する。limit 到達の gate return は `stop-incomplete` とする。
Outcomes: downstream dispatch、producer retry、または `stop-incomplete`。Flow は producer `stop-incomplete` / insufficient-evidence を plain `incomplete` へ変換せず、round limit の選択・固定、gate assessment の意味、candidate の修正と採否は Flow 外の親へ返す。

### review-dispatch

Trigger: 親が artifact snapshot と review readiness を確定し、review routing を要求したとき。
Inputs: 親確定の artifact_kind、applicability、user review opt-out、review goal、reviewer data、Acceptance Criteria / 設計 readiness、reviewer availability。
Procedure: parent-confirmed applicability は opt-out より先に評価する。nonapplicable は normal completion、applicable + opt-out は normal completion、applicable + no opt-out + ready は review dispatch とする。readiness failure または reviewer failure は review-not-established として親へ返す。
Outcomes: nonapplicable、opt-out、review dispatch、または明示的な `review-not-established`。Flow は accept を返さず、finding の意味的な採否は親へ返す。

### local-artifact-completion

Trigger: 親が semantic completion eligibility と、Agentic / mixed side で確定した exact `publication_target` を渡したとき。
Inputs: semantic completion eligibility、凍結した成果物本文 bytes、および親確定の `publication_target` Data。`publication_target` は existing destination の observed destination object identity、または OS-temp の verified temp-root identity / top-level `exact_destination` / exclusive creation intent の排他的 Data を持ち、作成前の directory object identity を要求しない。
Procedure: skill-relative `../../references/plan-artifact-publication.md` を publication invocation 前に一度だけ load し、identity `plan-artifact-publication-v1` と必要本文を検証する。検証済み reference の `programmatic-publication` Flow に、親確定の `publication_target` をそのまま渡す。Flow の結果を受け取り、published result から `final-candidate` / `incomplete` と stdout の Result、Summary、必要な Human Attention、Artifact path だけを projection する。consumer は target selection、candidate ranking、filename、retry bound、publication procedure を再実行・複製しない。
```text
publication_reference = ../../references/plan-artifact-publication.md
publication_load_timing = once before programmatic-publication use
publication_identity = plan-artifact-publication-v1
publication_use = parent-confirmed publication_target -> programmatic-publication -> outward status/stdout projection
```
Outcomes: published result と consumer の outward status / stdout projection、`destination-reselection-required`、または `incomplete`。資格喪失、unsafe / unknown、loader failure は親へ返し、Flow の結果を blind fallback や implicit reselection へ変換しない。

## plan-candidate-producer の前段

artifact の起草・再構成に入る直前に、親は次の Loader Data で `plan-artifact-design` を一度だけ load し、identity と required section を検証する。最初の成功 snapshot を同一 invocation 内で固定し、gate return による producer retry と review 採用修正でも再利用する。workflow 開始時の調査だけでは load しない。失敗時は推測で従来形式の artifact を生成せず、既存の `stop-incomplete` / `incomplete` へ返す。検証済み本文だけを既存の判定基準へ注入し、Loader Data と path は producer Inputs に載せない。

```text
design_reference = ../../references/plan-artifact-design.md
design_load_timing = once immediately before first artifact drafting or restructuring in the invocation
design_identity = plan-artifact-design-v1
design_required_sections = [適用範囲, Human-facing Summary, Agent-facing Detail, Verification / Completion Criteria の近接配置, Acceptance Criteria / Verification / Completion Criteria の責務分離, Information placement, Reference pointer]
design_failure = existing incomplete path; no new status
design_snapshot = first successful verified body is frozen for the invocation
design_use = inject verified body into existing 判定基準; Loader Data and path are not producer Inputs; no dedicated channel or return field
```

起草は、同じ親 context 内の internal `plan-candidate-producer` を前段として開始する。`plan-candidate-producer` は要求、repository、既存仕様を
調査して candidate を作り、必要なら read-only `plan-quality-advisor` の insight を受け取る。advisor insight は
非拘束 Data であり、planner は一次情報と要求に照らして `adopted` / `rejected` / `unresolved` を裁定する。
自動採用せず、新仕様、scope、AC、ユーザー嗜好を推測しない。具体的な品質向上が残る間だけ bounded に改善し、
不可約な意味衝突、blocking evidence 不足、または安全な candidate を推奨できない場合だけ `stop-incomplete` と必要な判断・evidence を返す。
軽い不確実性や複数案は evidence と比較理由を添えて Agent が推奨する。

`plan-candidate-producer` が caller-owned parent へ返した `candidate snapshot` は内容を識別できる不変 Data として後段へ渡す。
`stop-incomplete` の場合は caller-owned parent がそこで停止し、後段工程を選択しない。それ以外も gate を通過した candidate だけを
`review-refine` へ渡す。

親は同じ親 context の internal `structural-health-gate` として、未指定時の valid `rounds.limit` を loop 開始時に選択・固定する。親は candidate snapshot、gate assessment、gate evidence、current round、producer status を確定 Data として `candidate-structural-gate-routing` Flow へ渡す。
親は structural gate の意味を裁定し、必要な candidate の準備・修正・採否を保持する。Flow outcome 後の意味判断は親に残し、Flow はこの手順の唯一の deterministic witness とする。

gate を通過した candidate snapshot だけを、必要な review goal とともに既存の `review-refine` へ渡す。この順序
（plan-candidate-producer → structural-health-gate → review-refine）を飛ばさず、review-refine の採否・受け入れ・後続 Action は
既存の責務境界に従う。

## 成果物

成果物は依頼に適した自由形式の文書である。一般的な artifact content（目的、観測可能な成功条件、scope / exclude / 依存 / 制約、前提と未確定、残存 risk）は検証済み `plan-artifact-design` を正本とする。

選んだ方針と採用理由、代替案を採らない理由を記録する。

ユーザーが実装単位の案を求める場合は自由形式成果物の一部として自然文で記述してよいが、正式な Implementation Unit Data または
Implementation Unit normalization とは扱わない。正式な normalization は implementation-time の `impl-lead` が current repository state を
再観測して行う。base_snapshot を含む base、route、order、実行結果、review 等の execution data、委譲、実装、worker、isolation、
後続 Skill の起動権限、accept の確定、保存を成果物へ含めない。

実装を要求と同時に渡されても、成果物の起草で停止し、実装開始を責務外として明示する。成果物を固定の
実装 schema、委譲契約、確定済み実行指示へ変形しない。後続 skill の起動権限や acceptance は出力に含めない。

## 入力の確認

起動前に要求原文、目的、対象、成功条件、scope、exclude、依存、制約、既知の current state を観測する。
不足または矛盾が成果物の品質に影響する場合は、推測で埋めず、成果物に「確定が必要な問い」として記録する。
軽微な不足は、推測ではなく `assumptions` と根拠へ分けて明示する。要求の AC を言い換えて強めたり、対象外の
方針を導入したりしない。

成果物種別を `artifact_kind` として execution data に記録する。実装を前提とするプラン系か否かは review-refine
の reviewer 適用可否だけに使い、自由形式成果物をプラン系へ変える理由にしない。

## review の判断

まず `artifact_kind` と既定 `plan-adversarial-reviewer` の責務から、成果物が reviewer 適用対象かを親が判定し、確認済み applicability を Flow に渡す。
適用対象なら、ユーザーの review 省略指定を親が確認し、確認済み opt-out を applicability とともに Flow に渡す。
`review_goal` は、ユーザー指定の review goal や追加の具体的な risk がない場合、「実装前プランの具体的な failure path を確認し、確定候補にできるか判断する」とする。
これは plan review 自体の既定目的であり、毎回 risk を事前発見することを要求しない。ユーザー指定 goal や追加 risk は既存 reviewer の責務内で追加できる。
review の明示要求は既定起動の前提にせず、具体的な risk を review goal として追加する場合だけ親が記録する。

既定 reviewer は `plan-adversarial-reviewer`、final trim は `over-engineering-reviewer`（プラン入力モード）である。
適用対象の成果物に対する他の reviewer はユーザーが明示した場合、または risk が既存 reviewer の責務に対応する場合だけ親が選ぶ。
review を予定し既定 reviewer の適用対象となる成果物は、reviewer の入力前提である「Acceptance Criteria」の節名と「設計」の節名を持つように親が起草・確認し、readiness Data として Flow に渡す。

`review-refine` へ渡す入力は成果物の不変 snapshot、artifact_kind、要求と判定基準、review goal、ユーザー指定の reviewer・回数制約、必要なら継続台帳である。
ユーザーが回数・打ち切りを指定しなければ、round 制御を固定値で渡さず、親が loop 開始時に上限と打ち切りを決める。成果物の内容は review-refine の入力 resource へ書き戻さず、採用修正を反映した会話内 execution data として受け取る。
runtime が skill 間起動を提供しない場合も、親は同じ `review-refine` 本文を工程として直接参照できる。この代替は発火条件、入力 Data、裁定、termination、受け入れの責務を変更しない。

## review 結果の受領

review-refine の通常出力は、採用 finding を反映した成果物、指摘台帳、判断保留台帳、未解決 finding、final trim
の有無と理由、`termination`、`adversarial_review_count` である。reviewer が返す finding と review evidence は親が受け取り、通常 output として保持する。

reviewer は指摘だけを行い、採否や保留を確定しない。親は review-refine の結果を `adopted` / `rejected` / `out-of-scope` /
`deferred` / `human-confirmation` のいずれかへ evidence・理由とともに裁定して保持する。`deferred` は既存の hold ledger を
通じて次回入力へ渡し、loop 中は凍結する。保留を根拠に新しい仕様を派生させない。round、誘発収束、final trim の判定は
review-refine の出力契約に従い、ここで再計算しない。

## 確定

status は上記 `outward candidate status Calculation` を唯一の判定として参照し、ここで条件を再定義しない。review を実行した場合も
`termination` と計画の `final-candidate` / `incomplete` を別々に親へ返す。`round-limit`、批判の出尽くし、または残存 finding は
process Data として保持し、status Calculationの入力へ渡す。review-refine が `stop-incomplete` を返す process failure は、
その process failure を隠さず、status Calculationの結果を返す。
`final-candidate` では、成果物内容に属する residual risk と scope 外事項は本文に統合し、Human の最終判断に必要なものだけを Human Attention へ渡す。

review を実行しない場合は、要求の不足、scope、制約、残存 risk を親が確認できる通常の起草確定へ進める。どちらの場合も
成果物の最終採用、issue や既存 resource への書き戻し、実装・委譲の開始は Human の許可を受けて親が実行する。

## destination selection

semantic completion eligibility が成立したあと、親は Agentic destination 確定の前に次の Loader Data で `destination-selection` を一度だけ load し、identity と必要本文を検証する。失敗時は推測で destination を確定せず、既存の `incomplete` へ返す。

```text
destination_reference = ../../references/destination-selection.md
destination_load_timing = once before Agentic destination confirmation
destination_identity = destination-selection-v1
destination_required_sections = [Inputs / Outputs, Candidate facts, caller_owned_predicates の適用範囲, Programmatic Flows, Agentic unique selection, destination-reselection]
destination_failure = existing incomplete path; no new status
```

親は既存 project-local の用途 evidence と verified OS-temp を candidate facts として観測し、Git ignored/index predicates を project-local および canonical path が repository 内に入る OS-temp にだけ適用する範囲で渡す。repository 外の verified OS-temp に Git predicates を適用しない。decoy 一覧 HOW と ranking procedure をこの Skill に置かない。

destination 確定は destination-qualification の 3 値に従う:

1. explicit 確定 → それを使う
2. qualified set のときだけ unique selection 本文を適用する
3. explicit incomplete および入力不足 incomplete → unique selection を起動せず incomplete。`publication_target` を組まない

成功 destination に filename / retry を足して `publication_target` を確定し、`local-artifact-completion` へ渡す。
`destination-reselection-required` を受けたとき、元が Human explicit なら同じ requested_destination を保持し unique-best auto-select へ落とさない。元が auto unique-best なら別 destination を無言で選ばない。

## local artifact completion

semantic completion eligibility が成立した場合だけ成果物本文の byte snapshot を凍結し、親が確定した `publication_target` を
`local-artifact-completion` Flow へ渡す。成立しない場合は path 選択も write も行わず `incomplete` とする。artifact には凍結した成果物本文の
bytes だけを入れ、要約、Human Attention、gate / review 結果、decision / finding ledger その他の process Data を追記しない。
`final-candidate` の stdout は成果物全文を出さず、Result、成果物内容だけの短い Summary、必要な場合だけ Human Attention、実際に保存・確認した
Artifact local path に限る。保存した artifact は Git 管理、永続保存、最終採用、または後続 Action の許可を意味しない。
```text
workflow = plan-agent
artifact_eligibility = semantic completion eligibility and verified publication_target
artifact_body = frozen final candidate body only
artifact_excludes = [Semantic Delta, Verification Delta, Human Attention, gate result, review result, decision ledger, finding ledger, process history]
pre_publication_artifact = none when incomplete
stdout = Result, short Summary, optional Human Attention, Artifact local path
stdout_excludes = full artifact body, Semantic Delta, Verification Delta, gate or review result, decision or finding ledger, process history
summary_opt_out = Artifact only
authority = not Git management, durable persistence, final acceptance, or downstream Action permission
```
