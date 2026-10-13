// Повторяют схемы бэка: bloomy_bot/app/feature/{user,dates,reviews}/schemas.py

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
