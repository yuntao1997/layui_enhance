module.exports = {
    title: 'Layui组件增强',
    description: 'Layui组件增强',
    base: "/layui_enhance/",
    markdown: {
        externalLinks: {
            target: '_blank',
            rel: 'noopener noreferrer'
        }
    },
    themeConfig: {
        displayAllHeaders: true,
        sidebar: {
            '/guide/': [{
                title: '快速入门',
                collapsable: false,
                children: [
                    '',
                    'quick-started'
                ]
            },{
                title: '表格功能演示',
                collapsable: false,
                children: [
                    '/guide/table-demo/editable',
                    '/guide/table-demo/col-formatter',
                    '/guide/table-demo/base-method',
                ]
            },{
            	title: "未完待续"
            }]
        },
        lastUpdated: '最后更新时间', // string | boolean
        nav: [
            { text: '指南', link: '/guide/' },
            { text: '源码下载', link: 'https://github.com/yuntao1997/layui_enhance' },
        ],
        
    }
}