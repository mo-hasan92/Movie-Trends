
async removeFromWatchlist(movieId: string): Promise < void> {
  const user = await this.getUser();
  const ref = doc(this.firestore, `users/${user.uid}/watchlist/${movieId}`);
  await deleteDoc(ref);
}

