if (group === "info" && subcommand === "list") {
  try {
    console.log("[rate info list] 処理開始");

    const embed = buildGoldRateListEmbed();

    console.log("[rate info list] Embed作成成功");

    return await interaction.reply({
      embeds: [embed],
    });
  } catch (error) {
    console.error("[rate info list] エラー:", error);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: "❌ レート一覧の表示に失敗しました。",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: "❌ レート一覧の表示に失敗しました。Renderのログを確認してください。",
      ephemeral: true,
    });
  }
}