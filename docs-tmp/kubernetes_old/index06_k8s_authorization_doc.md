# RBAC

RBACは、Kubernetesクラスタ内で「誰が」「何に対して」「何をできるか」を制御する認可（Authorization）の仕組みです。ユーザーやServiceAccountに対して、直接権限を付与するのではなく「ロール」を介して権限を付与します。

## RBACとは

RBAC（Role-Based Access Control）は、Kubernetesに限らない一般的なアクセス制御の考え方です。
「個人に直接権限を割り当てるのではなく、役割(Role)を介して権限を割り当てる」という考え方です。

※RBAC以前は、ユーザごとに個別に「このユーザーはこのファイルを読める」「あのユーザーはあの操作をできる」と1つずつ紐付ける方式でした。ただ、これは人が増えるほど管理が破綻します。

対比として、ABAC（Attribute-Based Access Control）があります。
