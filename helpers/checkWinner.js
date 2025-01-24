const types = {
	k: 'k',
	n: 'n',
	b: 'b',
};

const rules = [
	{
		type: types.k,
		beat: types.n,
	},
	{
		type: types.n,
		beat: types.b,
	},
	{
		type: types.b,
		beat: types.k,
	},
];

// Check the winner of the game
export const checkWinner = (primaryPlayerMove, secondaryPlayerMove) => {
	const primaryPlayerRule = rules.find(rule => rule.type === primaryPlayerMove);
	const secondaryPlayerRule = rules.find(rule => rule.type === secondaryPlayerMove);

	if (primaryPlayerRule && secondaryPlayerRule) {
		if (primaryPlayerRule.beat === secondaryPlayerMove) {
			return 'primary';
		} else if (secondaryPlayerRule.beat === primaryPlayerMove) {
			return 'secondary';
		} else {
			return 'It\'s a tie';
		}
	} else {
		return 'Invalid moves';
	}
}