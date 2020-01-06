export default ({
    Vue, // VuePress 正在使用的 Vue 构造函数
    options, // 附加到根实例的一些选项
    router, // 当前应用的路由实例
    siteData // 站点元数据
}) => {
    try {
        if (!document) {
            return
        }

        const cnzzScript = document.createElement('script')
        cnzzScript.src = location.protocol + '//v1.cnzz.com/z_stat.php?id=1278556162&show=pic'
        document.body.appendChild(cnzzScript)


        router.beforeEach((to, from, next) => {
            if (window._czc) {
                let location = window.location
                let contentUrl = location.pathname + location.hash
                let refererUrl = '/'
                window._czc.push(['_trackPageview', contentUrl, refererUrl])
            }
            next()
        })
    } catch (e) {
        console.error(e.message)
    }

};