# Networking

## Service（ClusterIP, NodePort, LoadBalancer）

Podは再作成されるたびにIPアドレスが変わってしまうため、Podへの安定したアクセス経路を提供するのがServiceの役割です。Serviceは、ラベルセレクタで対象のPod群をグループ化し、単一の仮想的なIPアドレス・DNS名でアクセスできるようにします。

|タイプ|概要|
|---|---|
|ClusterIP（デフォルト）|クラスタ内部からのみアクセス可能な仮想IPを割り当てる。クラスタ内のPod間通信で使われる|
|NodePort|ClusterIPに加え、全Nodeの指定ポート（30000〜32767番）でも待ち受ける。`<NodeのIP>:<NodePort>`でクラスタ外部からアクセスできる|
|LoadBalancer|NodePortに加え、クラウドプロバイダのロードバランサを自動的にプロビジョニングする。cloud-controller-managerがこの外部連携を担う|
|ExternalName|特定の外部DNS名へのエイリアスとしてServiceを機能させる（Pod選択を伴わない特殊なタイプ）|

Serviceは、名前解決（後述のCoreDNS）と組み合わせることで、Pod側は「サービス名」だけを知っていればよく、実際にどのPodが応答するかを意識せずに通信できます。

## Ingress

Ingressは、HTTP/HTTPSのリクエストを、ホスト名やURLパスに基づいて適切なServiceへ振り分ける、L7（アプリケーション層）のルーティングルールです。

|項目|概要|
|---|---|
|Ingressリソース|ルーティングルール（どのホスト・パスをどのServiceに振り分けるか）を宣言的に定義する|
|Ingress Controller|Ingressリソースの内容を実際に解釈し、ロードバランサやリバースプロキシとして動作するコンポーネント（NGINX Ingress Controller等）。Ingressリソース単体では何も起こらず、必ずController側の導入が必要|
|TLS終端|Ingress側でSSL/TLSの復号化を一括して行い、バックエンドのServiceへは平文で転送するといった構成が一般的|

1つのIngressで複数のホスト名・パスに対するルーティングルールをまとめて定義できるため、多数のLoadBalancer型Serviceを個別に用意するよりも、外部からの入口を一元化しやすくなります。

## Endpoint / EndpointSlice

Endpoint（およびその後継であるEndpointSlice）は、Serviceの背後に実際に存在するPodのIPアドレス一覧を保持するリソースです。

|リソース|概要|
|---|---|
|Endpoints|Serviceが作成されると自動的に生成される、対象PodのIP・ポート一覧|
|EndpointSlice|Endpointsの後継として導入された仕組み。1つの大きなリストではなく、複数の「スライス」に分割して管理することで、大規模クラスタでのスケーラビリティを向上させている|

Service（ラベルセレクタに基づく抽象的なグループ）と、Endpoint/EndpointSlice（実際のPodのIPリスト）は別々のリソースとして管理されており、kube-proxyはこのEndpoint情報をもとに実際の転送ルール（iptables/IPVS）を構築します。

## NetworkPolicy

NetworkPolicyは、Pod間・Namespace間の通信を制御するルールです。デフォルトでは、クラスタ内の全Podは互いに自由に通信できますが、NetworkPolicyを適用することで、この通信を明示的に制限できます。

|項目|概要|
|---|---|
|podSelector|どのPodに対してこのルールを適用するか|
|Ingress/Egress|そのPodへの受信通信（Ingress）、そのPodからの送信通信（Egress）をそれぞれ制御できる|
|from/to|通信を許可する相手（他のPod、Namespace、IPブロックなど）を指定する|

NetworkPolicyは、ルールを定義するだけでは機能せず、これを実際に評価・適用できるCNIプラグイン（Calico、Ciliumなど）がクラスタに導入されている必要があります。マルチテナント環境や、機密性の高いワークロード（DBなど）への通信経路を限定したい場合に利用されます。

## CNIとPod間通信

CNI（Container Network Interface）は、Kubernetesのネットワーク機能を実現するための標準化されたプラグインインターフェースです。Kubernetes自体はPod間のネットワークをどう実現するかの具体的な実装を持たず、CNIプラグインにその処理を委譲しています。

|項目|概要|
|---|---|
|CNIプラグイン|Pod起動時にkubeletから呼び出され、Podにネットワークインターフェースを割り当て、IPアドレスを付与する|
|代表的な実装|Calico, Cilium, Flannelなど。オーバーレイネットワーク方式やBGPによるルーティング方式など、実現方式は実装によって異なる|
|Pod間通信の前提（フラットネットワークモデル）|Kubernetesは「NATを介さずに、全PodのIPアドレスが互いに直接到達可能である」ことを前提としており、CNIプラグインはこの前提を満たすようにクラスタ全体のネットワークを構築する|

この「フラットネットワークモデル」の実現方法（オーバーレイか、BGPによる直接ルーティングかなど）は各CNI実装によって異なりますが、Kubernetes自体はその詳細を意識せずに済むよう設計されています。

## CoreDNSによる名前解決

CoreDNSは、Kubernetesクラスタ内で標準的に使われるDNSサーバで、Kubernetes自体もDeploymentとして`kube-system`Namespace内で動作しています。

|項目|概要|
|---|---|
|Serviceの名前解決|`<Service名>.<Namespace名>.svc.cluster.local`のような形式で、ServiceのClusterIPを解決できる|
|Pod内での参照|同一Namespace内であれば`<Service名>`だけで、他Namespaceのサービスへは`<Service名>.<Namespace名>`で参照できる|
|Headless Service連携|StatefulSetと組み合わせるHeadless Service（ClusterIPを持たないService）を使うと、個々のPod単位でのDNS名も解決できる|

各Podの`/etc/resolv.conf`は、kubeletによって自動的にCoreDNSを参照するよう設定されるため、アプリケーションはIPアドレスを意識せず、サービス名ベースの名前で他のコンポーネントと通信できます。

## GKEでの特徴

GKEは、GCPのネットワーキング機能とKubernetesのネットワーク機能を統合しており、標準のKubernetesにはない専用の仕組みが多数用意されています。

|項目|概要|
|---|---|
|VPCネイティブクラスタ|PodのIPアドレスを、GCPのVPC内で直接ルーティング可能な「エイリアスIP」として割り当てる方式（デフォルト）。オーバーレイネットワークを介さず、VPCのファイアウォールルールをPod単位に直接適用できる|
|Cloud Load Balancing連携|Serviceタイプ`LoadBalancer`を作成すると、GCPのネットワークロードバランサまたはリージョン内部ロードバランサが自動的にプロビジョニングされる|
|GKE Ingress / Gateway|IngressリソースやGateway APIに対応したGKE組み込みのControllerが、Google Cloud Load Balancing（L7）と連携してグローバルなHTTP(S)ロードバランサを構築する|
|GKE Dataplane V2|Ciliumベースの eBPF を用いたデータプレーン実装。NetworkPolicyの適用に加え、より詳細なネットワーク可観測性を提供する|
|Cloud DNS連携|クラスタ内DNSはCoreDNSが引き続き担うが、外部公開するホスト名の管理にCloud DNSと連携させることが多い|
|Cloud NAT|Private（外部IPを持たない）Nodeが、クラスタ外部（インターネット）へアクセスする際の送信経路として利用される|

これらの機能により、GKE環境ではPodやServiceのネットワークが、GCPのVPCという既存のクラウドネットワーキングの仕組みと自然に統合された形で扱えるようになっています。
