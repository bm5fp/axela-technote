# Service

k8sのPodのIPは動的に割り振るため、直接アクセスできません。
そのため前段に何かしらの公開用の仕組みを用意する必要となるのですが、それがService、Ingress、Gatewayというリソースになります。

手段としては大きくL4ロードバランサ、名前解決、L7ロードバランサに大別できます。
整理すると以下のようになります。

|リソース種別|手段|リソース|
|---|---|---|
|Sevice|L4ロードバランサ|ClusterIP、NodePort、LoadBalancer、ClusterIP+NEG|
|Sevice|名前解決|ExternalName、HeadlessService|
|Ingress|L7ロードバランサ|Ingress（オンプレミス、クラウド）|
|Gateway|L7ロードバランサ|Gateway（オンプレミス、クラウド）|

それぞれ概要を解説していきます。

## ClusterIP

こちらは、Podの前段に内部L4ロードバランサを配置するイメージとなります。
ClusterIPには内部用のFQDNが割り当てられます。
PodからはClusterIPを通してアクセスします。

![ClusterIP](index03_k8s_service_img01.png)

## NodePort

ClusterIPは内部L4ロードバランサのため、クラスタの外からアクセスできません。
NodePortを利用すると、ClusterIPをノードのポートにマッピングできます。
NodePortはオンプレミスを想定したリソースであり、前段にオンプレミスのロードバランサを配置する前提に立つと理解しやすいです。

![NodePort](index03_k8s_service_img02.png)

なお、NodePortの通信は、デフォルトではk8sの中で再度バランシングされます。つまり、Node1に届いた通信はNode2のPodに転送されることがあります。ノードに届いた通信は必ずそのノード上のPodで処理するように設定することもできますが、その場合はNode上に必ず該当のPodが立ち上がっておくようにする必要があります。

## LoadBalancer

GCPなどのクラウド環境では、GCPとk8sがcloud-controller-managerで連携することで、k8s経由でGCLBを作成することができます。
これにより、GCLBの設定もk8sのマニュフェストとして管理することができます。

![LoadBalancer](index03_k8s_service_img03.png)

なお、GCLBのバックエンドはノードになります。
そのため、NodePortと同様に、ノードに届いた通信は、k8sの中で再度バランシングされます。
これらはレイテンシの低下につながる中で、後述のNEGを利用すると、より最適化されたバランシングを提供できます。

## ClusterIP+NEG

GCPには、Network Endpoint Group（NEG）というリソースがあります。
NEGは本来GCLBのバックエンドを柔軟に定義することを目的にしており、NEGを利用することでGCLBのバックエンドを外部サーバや外部サービス、Cloud RunやAPp Engineなどに設定することができます。
k8sにおいては、GCLBのバックエンドをPodに設定することができます。

![ClusterIP+NEG](index03_k8s_service_img04.png)

なおNEGを利用すると、ClusterIPを経由せず、GCLBからPodに通信を直接転送します。これによりレイテンシが削減され、更にはPod単位でのヘルスチェック、Pod単位でのセッションアフィニティなどを実現できます。

また、k8sの管理はNEGまでとなるため、GCLBをTerraform管理下に置くことが可能になります。
加えて、GCLBとk8sが疎結合になるため、GCLBバックエンドとなるNEGの付け替えによる、縮退やBulue-Greenデプロイを実現することも可能になります。

## ExternalName

ExternalNameは、Podが外部にアクセスする際のリソースになります。わかりやすいのはデータベースへのアクセスです。
Podから直接データベースにアクセスすることも可能ですが、ExternalNameを利用すると、データベースへのアクセスに名前解決を一つ挟むことができるようになります。これにより、データベースの接続先を容易に変更することが可能になります。また、環境ごとにデータベースを容易に変更することができるようになります。

![ExternalName](index03_k8s_service_img05.png)

## HeadlessService

HeadressSeviceは、主にStatefulSetのPodにアクセスする際に利用します。
HeadressServiceのFQDNを名前解決すると、全PodのIPが返ってきます。

* 例）Service名：hoge.ns.svc.cluster.local → 10.0.0.5, 10.0.0.6, 10.0.0.7

![HeadlessSevice](index03_k8s_service_img06.png)

また、Podを名前を指定して名前解決することもできます。

* 例）Pod名：hoge-0.hoge.ns.svc.cluster.local → 10.0.0.5

これらによって、クライアントで接続するPodを柔軟にコントロールすることが可能になります。

なお、StatefulSetではない通常のPodでもHeadlessServiceは利用できます。
配下のPodの全IPが返ってくるため、全Podに対する一斉通信などが可能になります。

## Ingress

IngressはL7ロードバランサとなります。
Ingressの実態はIngressリソースとIngress Controllerという二つのコンポーネントから成り立っています。
Ingressリソースは転送のルール定義である一方、Ingress Controllerは実際に転送を動かす実体となります。

Ingress Controllerの種類としては以下のようなものが挙げらます。

|区分|Ingress Controller|
|---|---|
|オンプレ|nginx Ingress Controller|
|オンプレ|Traefik|
|オンプレ|HAProxy|
|クラウド|GKE Ingress Controller|
|クラウド|AWS Load Balancer Controller|
|クラウド|Azure Application Gateway Ingress Controller|

オンプレとクラウドでは大きく内容が異なるため、「nginx Ingress Controller」と「GKE Ingress Controller」に分けてそれぞれ説明します。

### オンプレIngress

実態としては、ClusterIPの前にNodePortのNginxが立ち上がる形になります。

![Ingress-Onpremiss](index03_k8s_service_img07.png)

Ingressを利用するにあたり、全にClusterIPとnginx Ingress Controllerを作成しておく必要があります。
nginx Ingress Controllerは、一般公開されたHelm Chart等で作成できます。

その上で、Ingressリソースを作成すると、定義された転送ルールがIngress Controllerに自動的に反映され、L7ロードバランサを実現できます。

自前でNginx Podを用意するのに比べ、k8sマニュフェストで転送ルールをk8sマニュフェストで定義できる点、またNginx構築が削減される点にメリットがあります。

### クラウドIngress

クラウドのIngressの場合は、Ingress ControllerとしてクラウドのL7ロードバランサが作成されます。
GCPの場合は、GCLB（ALB）が作成されます。

![Ingress-Cloud](index03_k8s_service_img08.png)

オンプレと同様に、k8sマニュフェストで転送ルールをk8sマニュフェストで定義できる点、またGCLB構築が削減される点にメリットがあります。

## Gateway

GatewayはIngressの改善リソースになります。
Ingressと同様に、実態はGatewayリソースとGateway Controllerという二つのコンポーネントから成り立っています。
Ingressに比べて、以下のような点が改善されています。

* リソース分離

    Ingressでは一つのIngressリソース一つであったのに対して、GatewayではGateway Class（どのGateway Controllerを利用するか）、Gateway（リッスンポートやSSL設定）、HTTPRoute（パスルーティングルール）の三つのリソースに分割されて構成されます。
    そのため、インフラ担当とアプリケーション担当で管理するリソースを分担できます。

* ルーティングルール

    Ingressは標準でパスルーティングしかサポートされていませんでしたが、Gatewayではヘッダールーティング、カナリアリリース、URLリライトなどが標準サポートされています。

### オンプレGateway

Ingress同様、実態としてはClusterIPの前にNodePortのNginxが立ち上がる形となります。

![Gateway-Onpuremiss](index03_k8s_service_img09.png)

### クラウドGateway

Ingress同様、Gateway ControllerとしてクラウドのL7ロードバランサが作成されます。

![Gateway-Cloud](index03_k8s_service_img10.png)

ただし、IngressではIngressリソースごとにクラウドのロードバランサが作成されていました。
一方でGatewayでは一つのクラウドロードバランサになります。これは課金の観点でIngressに比べて優位になります。

#### NEGの利用

NEGの前段にはGCLB（ALB）も立てられるので、L7ロードバランサはNEGでも実現できます。
なお、AWSではTargetGroupBindingにより、同様の構成が実現できます。