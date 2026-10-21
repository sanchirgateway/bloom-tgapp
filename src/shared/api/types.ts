// Повторяют схемы бэка: bloomy_bot/app/feature/{user,dates,reviews,flowers}/schemas.py

export interface UserShort {
	id: number
	first_name: string
	username: string | null
}

export interface User extends UserShort {
	last_name: string | null
	timezone: string
	partner_id: number | null
}

export type DateStatus =
	'proposed' | 'planned' | 'declined' | 'done' | 'cancelled'

export interface DateCreate {
	title: string
	/** ISO с часовым поясом */
	starts_at: string
	ends_at?: string | null
	place?: string | null
	address?: string | null
	description?: string | null
}

// --- Отзывы: bloomy_bot/app/feature/reviews/schemas.py ---

export interface ReviewPhoto {
	/** Файл: GET /reviews/photos/{id} */
	id: string
	position: number
	content_type: string
	size: number
}

export interface Review {
	id: string
	date_id: string
	author_id: number
	rating: number
	liked: string | null
	disliked: string | null
	food: string | null
	comment: string | null
	photos: ReviewPhoto[]
	created_at: string
}

/** Отзыв партнёра, скрытый, пока пользователь не напишет свой: известно только, что он есть */
export interface LockedReview {
	author_id: number
	created_at: string
}

export interface DateReviews {
	can_review: boolean
	/** Открытые пользователю, включая его собственный */
	reviews: Review[]
	locked: LockedReview[]
	/** Когда скрытые отзывы откроются, даже если свой не написан */
	reveal_at: string
}

export interface ReviewCreated {
	review: Review
	/** Партнёр увидит отзыв только после того, как напишет свой */
	locked_for_partner: boolean
}

export interface ReviewCreate {
	rating: number
	liked?: string
	disliked?: string
	food?: string
	comment?: string
	photos: Blob[]
}

export interface DateItem {
	id: string
	title: string
	description: string | null
	place: string | null
	address: string | null
	/** ISO, UTC */
	starts_at: string
	ends_at: string | null
	status: DateStatus
	creator: UserShort
	invitee: UserShort
	/** Заполнены, только если status === 'cancelled' */
	cancelled_at: string | null
	cancelled_by: number | null
	cancel_reason: string | null
	created_at: string
}

// --- Цветы: bloomy_bot/app/feature/flowers/schemas.py ---

export type FlowerOccasion =
	'no_reason' | 'date' | 'birthday' | 'anniversary' | 'holiday' | 'apology'

export type FlowerReaction = 'loved' | 'touched' | 'happy' | 'meh'

export interface FlowerPhoto {
	/** Файл: GET /flowers/photos/{id} */
	id: string
	/** Даритель — сам букет, получатель — например, букет в вазе */
	author_id: number
	/** Своя у каждого автора */
	position: number
	size: number
}

/** Элемент GET /flowers/photos: фото вместе с букетом, к которому оно приложено */
export interface FlowerPhotoListItem extends FlowerPhoto {
	/** Букет: GET /flowers/{gift_id} */
	gift_id: string
	created_at: string
}

/** Чьи фото: свои, партнёра или все */
export type FlowerPhotoAuthor = 'mine' | 'partner' | 'all'

export interface FlowerGift {
	id: string
	giver_id: number
	recipient_id: number
	date_id: string | null
	/** «15 белых роз» */
	flowers: string
	occasion: FlowerOccasion | null
	comment: string | null
	/** В рублях; приходит только дарителю, получателю всегда null */
	price: number | null
	/** null — ещё не вручён (сюрприз): такие видит только даритель */
	given_at: string | null
	reaction: FlowerReaction | null
	reacted_at: string | null
	photos: FlowerPhoto[]
	created_at: string
}

export interface FlowerCreate {
	flowers: string
	occasion?: FlowerOccasion
	comment?: string
	price?: number
	date_id?: string
	/** ISO с часовым поясом; не передан — сюрприз, партнёр запись не видит */
	given_at?: string
	photos: Blob[]
}
