const { SlashCommandBuilder, EmbedBuilder, time, TimestampStyles } = require('discord.js')


function create_userEmbed(user,timeString,formattedDate,roleNames){
    const userEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('ユーザープロフィール')
        .addFields(
            { name:'ユーザー名', value:`${user.username}`  },
            { name:'ユーザーID', value:`${user.id}`},
            { name:'ユーザー作成日', value:`${timeString}`},
            { name:'このサーバーの参加日', value:`${formattedDate}`},
            { name:'ロール', value:`${roleNames}`}
        )
        .setImage(`${user.displayAvatarURL()}`)

    return userEmbed
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('選択したユーザーのプロフィールを表示')
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("情報を表示するユーザー")
                .setRequired(true)
        ),
    async execute(interaction) {
        const member = interaction.options.getMember('user') || interaction.member;
        const user = interaction.options.getUser('user')

        if (user) {
            //アカウント作成日取得
            const createdAt = member.createdAt; 
            const unixTime = Math.floor(user.createdTimestamp / 1000);
            const timeString = `<t:${unixTime}:F> (<t:${unixTime}:R>)`;
            //サーバー参加日取得
            const joinedDate = member.joinedAt;
            const joinedTimestamp = member.joinedTimestamp;
            const formattedDate = `${joinedDate.getFullYear()}年${joinedDate.getMonth() + 1}月${joinedDate.getDate()}日`;
            //ロール取得
            const roleNames = member.roles.cache.map(role => role.name);

            // Embed作成関数呼び出し
            const userEmbed = create_userEmbed(user,timeString,formattedDate,roleNames)

            if (userEmbed) {
                await interaction.reply({ embeds: [userEmbed] });
            } else {
                await interaction.reply({content: 'データの取得に失敗しました。', ephemeral: true})
            }
        }
    }
}