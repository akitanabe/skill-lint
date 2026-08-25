---
name: clarify-it
description: >-
  ユーザーが `clarify-it` を明示した場合、または対話しながら設計・方針・判断を段階的に明確化する意図が明確な場合に使う。
  Human が担う価値判断だけを一度に一つの decision context として提示し、現在の一貫した意思決定モデルへ再統合して返す。
  成果物や Issue の編集、実装、後続 Action は実行しない。
---

# clarify-it

<!-- @contract clarify-it-invocation -->
`clarify-it` の明示指定、または「詰めていきたい」「対話しながら設計・方針・判断を固めたい」のように、段階的な
明確化を求める意図が明確な依頼で開始する。単なる曖昧な相談や、Agent が回答を知らないという理由だけでは開始しない。
この Skill はそれ単独で動作し、外部の文書、path、URL を runtime dependency として要求しない。
<!-- @/contract -->

## Specification

<!-- @contract clarify-it-start-boundary -->
開始時に、目的、今回のスコープ、すでに確定している制約・判断、Agent が調査・分析・導出できる領域、Human の価値判断が必要に
なり得る領域を、Agent 内部の意思決定モデルへ整理する。これを前提確認リストとして Human に再承認させず、意思決定の境界そのものを
確定できない不足だけを Human へ返す。
<!-- @/contract -->

<!-- @contract clarify-it-normative-hierarchy -->
規範の優先順位は `Specification > Method > Casebook` とする。Specification は責務と結果の境界、Method は標準操作、
Casebook は境界例を定める。解釈が衝突した場合はこの順で上位を優先する。

Philosophy は通常の規範でも新しい要件源でもない。3層の矛盾、解釈衝突、または想定外ケースで、既存規則の保護目的を
回復する場合だけ参照する。そのための自己完結した回復用 Data は次のとおりである。

- Human の有限な認知資源を、本当に Human が決める必要のある価値判断へ集中させる。
- 判断空間を圧縮しても、Human の判断権限は圧縮しない。
- 対話を固定質問列ではなく、更新される意思決定モデルとして扱う。
- Agent は対話の継続性、依存関係、整合性を担う。
- 過去の結論ではなく、現在の根拠に従う。
- 局所質問の正しさより、対話全体の適切さを優先する。
- 強く固定するのは責任と成果の境界であり、内部の思考経路ではない。

この Data から通常時の新しい obligation を導出しない。
<!-- @/contract -->

<!-- @contract clarify-it-philosophy-reference -->
Philosophy reference は非規範であり、新しい obligation を作らない。通常実行に必須ではなく、`SKILL.md` 内の recovery data だけでも skill は動作できる。
矛盾、解釈衝突、または想定外ケースで詳細な設計意図を確認する場合は `references/philosophy.md` を参照する。
<!-- @/contract -->

<!-- @contract clarify-it-responsibility -->
Human の決定、観測事実、一時前提、Agent の導出を意味上区別する。Human は目的に照らした価値判断と結果責任を持つ。
Agent は調査、分析、技術的な導出、判断空間の圧縮、依存関係と整合性の維持、および現在モデルへの再統合に経過責任を持つ。
Agent が合理的に調査・導出できる事項を Human の選択へ置き換えない。
Agent は、Human に判断を求める前、自身の判断を確定する前、または `Completed` とする前に、現在の判断・責任境界・完了を
実質的に変え得る visible / referenced / materially relevant / retrievable な source が現在取得可能なら、exhaustive search を要求せず、
概念的推論より先にその事実との関係を確認する。
<!-- @/contract -->

<!-- @contract clarify-it-human-decision-point -->
Human Decision Point は、調査と導出の後にも Human の価値判断が本当に残る場合だけ提示する。Agent が答えを知らない、
技術的調査が不足している、または複数の実装案があるというだけでは Human Decision Point にしない。提示前に、判断を
変え得る事実、技術的不確実性、主要な反証材料を合理的な範囲で解消する。候補として、複数の妥当な選択肢で価値判断が必要な場合、
responsibility boundary、domain model・abstraction・design philosophy、public contract・externally observable behavior、
irreversible または変更コストの高い選択、既存の Human 判断から優劣を導けない場合、Human の意図によって正解が変わる場合を評価する。
これらへの該当は質問を発生させる十分条件ではなく、既存判断、調査、分析、技術的優劣から結論を導出できるなら Agent が処理する。
Human にのみ保持される既存事実・制約は Human Decision Point ではなく、必要な範囲の factual context として確認する。
<!-- @/contract -->

<!-- @contract clarify-it-decision-context -->
一度に提示するのは一つの独立した decision context とする。強く結合した判断は一つの context にまとめ、重くて理解が
難しい context は論点を増やさず複数 turn に分ける。選択肢は同じ判断対象、判断軸、同程度の抽象度で比較可能にし、標準順序は
「選択肢・主要差分 → 判断材料 → 推奨と理由 → 採否」とする。推奨を選択肢より先に置かず、同じ context が複数 turn にまたがる場合は
確定済みの説明を繰り返さず、その時点で必要な差分を中心に示す。根拠ある優劣を導ける場合だけ推奨と理由を示し、導けない場合は中立を保ち、
判断を分ける価値軸を示す。

次の問いが不連続なら、同じ turn に必要最小限の現在理解または遷移理由を添え、定型 summary、内部 state dump、確認専用 turn は要求しない。
新しい問題・改善候補は、その解決が目的、Human の判断、責任境界、または完了条件を実質的に変える場合だけ current context に取り込み、それ以外は未決事項と
完了条件から分離し、必要な場合だけ caller / Human へ follow-up candidate として返す。

短い承認は提示中の一意な context の採否に限り、モデル全体の妥当性や追加の Reconstruction の根拠へ拡張しない。

Human Decision Point などの内部の構造・判定用語は、意思決定モデルと caller / projection の判定用語として維持し、意味を rename / redefine しない。
内部語彙自体が議題でない限り Human に理解を要求しない。情報提供または判断を求める発話では、
判断対象、目的への影響、求める入力を対象領域の言葉で示し、固定的な内部語彙→対話語彙 dictionary は定義しない。
<!-- @/contract -->

## Method

<!-- @contract clarify-it-method -->
`Frame → Resolve → Select & Present → Integrate → Reevaluate` を標準操作として使う。これは固定 state machine ではない。

1. Frame: 現在の目的、観測事実、一時前提、未解決事項と依存を一つの意思決定モデルとして捉える。
2. Resolve: 調査、分析、技術的導出、反証確認によって、該当する material fact を概念的推論に先行させながら Agent が解消すべき不確実性を減らす。
3. Select & Present: Human の価値判断だけが残る一つの decision context を選び、固定スコアリングなしに、より上位の判断、後続判断を
   多く消去・拘束できるもの、判断空間を安定させるもの、重要な不整合を解消するものを原則として優先し、圧縮して提示する。
4. Integrate: Human の応答を局所回答として保存するだけでなく、現在モデルへ再統合し、短い承認は提示中の一意な context の採否としてのみ扱う。
5. Reevaluate: queue と依存、新規発見の current context への所属、完了前の material fact を再評価し、次の context、完了、または停止を決める。

Human の応答、新しい上位概念、前提変更を統合するたびに、未解決事項の queue と依存を再評価する。以前の分解が
信頼できなくなった場合は、まだ信頼できる地点まで戻り、意思決定モデルを再構成し、影響評価後も有効な判断・前提・境界を保持して再承認を求めない。一問一答や当初の質問列を完遂する
こと自体を目的にしない。

過去判断との差は直ちに矛盾とみなさず、対象、スコープ、前提、時点、評価軸の違いで合理的に説明できるかを先に評価する。複数の
整合的な解釈が残り、その違いが結果へ影響する場合だけ、Human の意図を補完せず、整合性回復に必要な差分を確認する。Human は
判断変更そのものの正当性を証明する責任を負わない。大規模な巻き戻しで意味の異なる複数の再構成が可能な場合は、Human が方向・
適用範囲・道筋を示し、その後の影響分析と再統合を Agent が担う。

`ok` など低情報量の承認が続くことは過剰詳細化のシグナルになり得るが、それだけを機械的な
再構成条件にはしない。

短い `ok` は、応答対象の context が一意な場合だけその採否として統合し、何への応答か不明なら確認する。モデル全体の妥当性や追加の Reconstruction の
根拠には拡張しない。Human が過剰詳細化を示した場合は局所質問を擁護せず、一段上の抽象度から再圧縮する。新しい evidence
によって選択肢の優劣が変わった場合は、過去の推奨を維持せず、推奨と理由を更新する。圧縮して提示した判断材料について詳細を求められた場合は、
当初の根拠、前提、観測事実、比較内容、主要な反証材料を正確に展開し、後から別の rationale を生成して当初の根拠とすり替えない。
<!-- @/contract -->

<!-- @contract clarify-it-completion -->
未決の Human Decision Point と重要な不整合がなく、現在の前提で一つの一貫した意思決定モデルへ再統合できた場合だけ
`Completed` とする。完了条件を満たさず途中終了する場合は `Stopped` とし、停止理由と残る判断を返す。

`Completed` では質問履歴や固定 schema ではなく、現在の一貫した意思決定モデルを、対象に自然な形式で caller / Human へ
返す。目的、現在の前提、主要な判断と根拠、重要な依存、棄却した主要代替、残存する不確実性を、対象に必要な範囲で
再構成する。現在の前提で成立しない古い判断を無批判に残さず、包含・重複した下位判断を必要に応じて整理する。Human はいつでも
対話を停止できる。
<!-- @/contract -->

<!-- @contract clarify-it-action-boundary -->
この Skill は明確化と再統合までを担う。成果物や Issue の編集、実装、委譲、コマンド実行、外部サービスへの書き込み、
後続 Action の開始は行わない。必要な後続 Action は実行せず、現在モデルの一部として caller / Human へ返す。
出力形式を固定せず、対象と判断内容に自然な表現を選ぶ。
<!-- @/contract -->

## Casebook

<!-- @contract clarify-it-casebook -->
- 複数案がある: 技術的根拠で優劣を導けるなら Agent が選び、価値判断だけが残る場合だけ一つの context として Human に提示する。
- Agent が知らない: 調査可能な不足を価値判断へ変換せず、取得可能な material fact を概念的推論より先に確認する。
- 判断が強く結合する: 別々に答えると矛盾する判断は一つの decision context にまとめる。
- 上位概念が変わる: 新しい目的で古い分解が無効になれば、古い queue を捨てて再構成する。
- 隣接する有用な発見: 現在の目的、Human の判断、責任境界、完了条件を実質的に変えない候補は current context から分離する。
- 根拠が変わる: 新しい evidence で優劣が変われば推奨を更新する。
- 過去判断と現在が衝突する: 過去判断を自動継承せず、現在の根拠で再評価する。
- 大規模な再構成: 意味ある全体像を作る前に早期圧縮せず、依存を捉えてから Human Decision Point を選び、影響評価後も有効な判断・前提・境界を保持する。
- 正しいが細かすぎる質問: 局所的に正しくても対話全体を過剰詳細化するなら、一段上から再圧縮する。
- 短い `ok`: 対象 context が一意ならその採否だけを統合し、一意でなければ確認する。モデル全体の妥当性や追加の Reconstruction の根拠には拡張しない。
- 内部語彙の投影: Human には判断対象、目的への影響、求める入力を対象領域の言葉で示す。
- 最終結果: 対話履歴の列ではなく、現在の一貫した意思決定モデルを返す。
<!-- @/contract -->
